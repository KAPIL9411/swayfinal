/**
 * Authentication & onboarding routes
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabaseAdmin, getSupabaseUser } from '../lib/db';
import { requireAuth } from '../middleware/auth';
import { adminEmails, isAdminUser } from '../lib/admin';
import type { AppEnv } from '../types';

export const authRoutes = new Hono<AppEnv>();

const emailSchema = z.object({ email: z.string().email().max(254) });

const otpSchema = z.object({
  email: z.string().email(),
  token: z.string().regex(/^\d{6}$/),
});

const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9_.]+$/)
  .refine((v) => !v.startsWith('.') && !v.endsWith('.') && !v.includes('..'), 'Invalid username');

const profileSchema = z.object({
  collegeId: z.string().uuid(),
  username: usernameSchema,
  avatarKey: z.string().min(1).max(32),
  interests: z.array(z.string().min(1).max(32)).min(3).max(10),
  lookingFor: z.enum(['friends', 'dating', 'both']),
  is18Confirmed: z.literal(true),
  guidelinesAccepted: z.literal(true),
  bio: z.string().max(160).nullish(),
  yearOfStudy: z.number().int().min(1).max(7).nullish(),
  branch: z.string().max(50).nullish(),
});

const profileUpdateSchema = z.object({
  bio: z.string().max(160).nullish(),
  yearOfStudy: z.number().int().min(1).max(7).nullish(),
  branch: z.string().max(50).nullish(),
  interests: z.array(z.string().min(1).max(32)).min(3).max(10).optional(),
  lookingFor: z.enum(['friends', 'dating', 'both']).optional(),
  isDiscoverable: z.boolean().optional(),
  avatarKey: z.string().min(1).max(32).optional(),
});

async function readJson(c: any): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

async function findCollegeByEmailDomain(supabase: ReturnType<typeof getSupabaseAdmin>, email: string) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  const { data } = await supabase
    .from('colleges')
    .select('id, name, city, state, email_domains')
    .contains('email_domains', [domain])
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

// Testing only: create/find the auth user and mint a real session for them
async function mintSessionWithoutOtp(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  email: string
) {
  await supabase.auth.admin.createUser({ email, email_confirm: true });

  const { data: link } = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
  const hashedToken = link?.properties?.hashed_token;
  if (!hashedToken) return null;

  const { data } = await supabase.auth.verifyOtp({ token_hash: hashedToken, type: 'email' });

  return data?.session ? data : null;
}

// Validate a college email domain and resolve the college
authRoutes.post('/verify-email', async (c) => {
  const parsed = emailSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Enter a valid email address' }, 400);
  }

  const supabase = getSupabaseAdmin(c.env);
  let college = await findCollegeByEmailDomain(supabase, parsed.data.email);


  // Any email can sign in now; an unknown domain simply means the student
  // verifies with a student ID instead of their college inbox.
  if (!college) {
    return c.json({
      verified: false,
      college: null,
      nextStep: 'verify-id',
      message: 'No college email on file for this domain - verify with your student ID.',
    });
  }

  return c.json({
    verified: true,
    college: {
      id: college.id,
      name: college.name,
      city: college.city,
      state: college.state,
    },
  });
});

// Send a 6 digit OTP to a college email
authRoutes.post('/send-otp', async (c) => {
  const parsed = emailSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Enter a valid email address' }, 400);
  }

  const email = parsed.data.email.toLowerCase();
  const supabase = getSupabaseAdmin(c.env);

  // Testing mode: skip Supabase mail entirely, the tester types the test code
  if (c.env.TEST_OTP_CODE) {
    return c.json({ success: true, testMode: true, message: 'Test code enabled' });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ success: true, message: 'Verification code sent' });
});

// Verify OTP and return a Supabase session
/**
 * Anonymous sign-up (no email, no OTP).
 * Creates a Supabase anonymous user and returns the same session shape as the
 * OTP flow, so the client does not care which one it used.
 * Requires "Allow anonymous sign-ins" to be enabled in Supabase Auth settings.
 */
authRoutes.post('/anonymous', async (c) => {
  const supabase = getSupabaseAdmin(c.env);

  const { data, error } = await supabase.auth.signInAnonymously();

  if (data?.session) {
    return c.json({
      isAnonymous: true,
      via: 'supabase-anonymous',
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      user: { id: data.session.user.id },
    });
  }

  const reason = error?.message ?? 'unknown';

  // "Anonymous sign-ins are disabled" -> fall back to a throwaway device account
  // (random internal email, random password, never shown to the student).
  if (/disabled|not enabled|anonymous/i.test(reason)) {
    const device = await createDeviceSession(supabase);
    if (device) {
      return c.json({ isAnonymous: true, via: 'device', ...device });
    }
  }

  return c.json(
    {
      error: 'Could not start a session. Try again in a moment.',
      code: 'anonymous_unavailable',
      detail: reason,
    },
    503
  );
});

/**
 * Fallback for projects where Supabase anonymous sign-ins are switched off:
 * create an internal account with a random email + password and sign in.
 */
async function createDeviceSession(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const email = `device-${crypto.randomUUID()}@sway.internal`;
  const password = `${crypto.randomUUID()}${crypto.randomUUID()}`;

  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data?.user) return null;

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data?.session) return null;

  return {
    session: {
      access_token: signIn.data.session.access_token,
      refresh_token: signIn.data.session.refresh_token,
      expires_at: signIn.data.session.expires_at,
    },
    user: { id: signIn.data.session.user.id },
  };
}

const adminCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

/**
 * Admin login for the web panel (email + password).
 * Only accounts in ADMIN_EMAILS or with profiles.is_admin can get in.
 */
authRoutes.post('/admin-login', async (c) => {
  const parsed = adminCredentialsSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Email and a password of 8+ characters are required' }, 400);
  }

  const supabase = getSupabaseAdmin(c.env);
  const email = parsed.data.email.toLowerCase();

  const signIn = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (signIn.error || !signIn.data?.session) {
    return c.json({ error: 'Wrong email or password' }, 401);
  }

  const userId = signIn.data.session.user.id;
  if (!(await isAdminUser(supabase, c.env, userId))) {
    return c.json({ error: 'This account is not an admin' }, 403);
  }

  return c.json({
    session: {
      access_token: signIn.data.session.access_token,
      refresh_token: signIn.data.session.refresh_token,
      expires_at: signIn.data.session.expires_at,
    },
    user: { id: userId, email },
  });
});

/**
 * One-time bootstrap for the first admin account.
 * Works only for emails listed in ADMIN_EMAILS and only while that account
 * does not exist yet, so it cannot be used to take over an existing admin.
 */
authRoutes.post('/admin-signup', async (c) => {
  const parsed = adminCredentialsSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Email and a password of 8+ characters are required' }, 400);
  }

  const email = parsed.data.email.toLowerCase();
  const allowed = adminEmails(c.env);

  if (!allowed.includes(email)) {
    return c.json({ error: 'This email is not on the admin allowlist' }, 403);
  }

  const supabase = getSupabaseAdmin(c.env);

  const created = await supabase.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (created.error || !created.data?.user) {
    return c.json({ error: 'Admin account already exists. Use the login form.' }, 409);
  }

  // Admins still need a profile row so the rest of the app keeps working.
  const { data: college } = await supabase
    .from('colleges')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (college) {
    await supabase.from('profiles').insert({
      id: created.data.user.id,
      college_id: college.id,
      username: 'swayadmin',
      avatar_key: 'owl',
      interests: [],
      looking_for: 'both',
      is_18_confirmed: true,
      guidelines_accepted_at: new Date().toISOString(),
    });
  }

  const signIn = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (signIn.error || !signIn.data?.session) {
    return c.json({ error: 'Account created. Please log in.' }, 201);
  }

  return c.json(
    {
      session: {
        access_token: signIn.data.session.access_token,
        refresh_token: signIn.data.session.refresh_token,
        expires_at: signIn.data.session.expires_at,
      },
      user: { id: created.data.user.id, email },
    },
    201
  );
});

authRoutes.post('/verify-otp', async (c) => {
  const parsed = otpSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Enter the 6 digit code' }, 400);
  }

  const supabase = getSupabaseAdmin(c.env);
  const email = parsed.data.email.toLowerCase();

  // Testing mode: a fixed code signs in without waiting for a real mail
  if (c.env.TEST_OTP_CODE && parsed.data.token === c.env.TEST_OTP_CODE) {
    const testData = await mintSessionWithoutOtp(supabase, email);

    if (!testData?.session) {
      return c.json({ error: 'Test login is unavailable right now' }, 500);
    }

    return c.json({
      session: {
        access_token: testData.session.access_token,
        refresh_token: testData.session.refresh_token,
        expires_at: testData.session.expires_at,
      },
      user: { id: testData.user?.id, email: testData.user?.email },
    });
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data.token,
    type: 'email',
  });

  if (error || !data.session) {
    return c.json({ error: 'Invalid or expired code' }, 401);
  }

  return c.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
    user: { id: data.user?.id, email: data.user?.email },
  });
});

// Exchange a refresh token for a fresh session (the app stores tokens itself,
// so the client never needs Supabase credentials)
authRoutes.post('/refresh', async (c) => {
  const parsed = z.object({ refreshToken: z.string().min(10) }).safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Refresh token required' }, 400);
  }

  const supabase = getSupabaseAdmin(c.env);
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: parsed.data.refreshToken,
  });

  if (error || !data.session) {
    return c.json({ error: 'Session expired', code: 'session_expired' }, 401);
  }

  return c.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
    user: { id: data.user?.id, email: data.user?.email },
  });
});

// Revoke the caller's session
authRoutes.post('/signout', requireAuth, async (c) => {
  try {
    await getSupabaseAdmin(c.env).auth.admin.signOut(c.get('token'), 'local');
  } catch {
    // Session may already be gone - the client clears local tokens regardless
  }

  return c.json({ success: true });
});

// Username availability (used while typing, before the profile exists)
authRoutes.get('/username/:username', async (c) => {
  const username = c.req.param('username').toLowerCase();

  if (!usernameSchema.safeParse(username).success) {
    return c.json({ available: false, error: 'invalid_username' }, 200);
  }

  const supabase = getSupabaseAdmin(c.env);
  const { data } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();

  return c.json({ available: !data });
});

// Current user's profile (null while onboarding is incomplete)
authRoutes.get('/me', requireAuth, async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', c.get('userId'))
    .maybeSingle();

  if (error) throw error;

  return c.json({ profile: data ?? null });
});

// Create the profile at the end of onboarding
authRoutes.post('/profile', requireAuth, async (c) => {
  const parsed = profileSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid profile details', details: parsed.error.flatten() }, 400);
  }

  const supabase = getSupabaseAdmin(c.env);
  const userId = c.get('userId');

  const { data: existing } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (existing) {
    return c.json({ error: 'Profile already exists' }, 409);
  }

  const { data: college } = await supabase
    .from('colleges')
    .select('id')
    .eq('id', parsed.data.collegeId)
    .eq('is_active', true)
    .maybeSingle();

  if (!college) {
    return c.json({ error: 'College not found' }, 404);
  }


  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      college_id: parsed.data.collegeId,
      username: parsed.data.username.toLowerCase(),
      avatar_key: parsed.data.avatarKey,
      interests: parsed.data.interests,
      looking_for: parsed.data.lookingFor,
      bio: parsed.data.bio ?? null,
      year_of_study: parsed.data.yearOfStudy ?? null,
      branch: parsed.data.branch ?? null,
      is_18_confirmed: true,
      guidelines_accepted_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505' || error.message.includes('duplicate key')) {
      return c.json({ error: 'Username is already taken', code: 'username_taken' }, 409);
    }
    throw error;
  }

  return c.json({ profile: data }, 201);
});

// Update own profile / settings
authRoutes.patch('/profile', requireAuth, async (c) => {
  const parsed = profileUpdateSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid profile details' }, 400);
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.bio !== undefined) patch.bio = parsed.data.bio;
  if (parsed.data.yearOfStudy !== undefined) patch.year_of_study = parsed.data.yearOfStudy;
  if (parsed.data.branch !== undefined) patch.branch = parsed.data.branch;
  if (parsed.data.interests !== undefined) patch.interests = parsed.data.interests;
  if (parsed.data.lookingFor !== undefined) patch.looking_for = parsed.data.lookingFor;
  if (parsed.data.isDiscoverable !== undefined) patch.is_discoverable = parsed.data.isDiscoverable;
  if (parsed.data.avatarKey !== undefined) patch.avatar_key = parsed.data.avatarKey;

  if (Object.keys(patch).length === 0) {
    return c.json({ error: 'Nothing to update' }, 400);
  }

  const supabase = getSupabaseUser(c.env, c.get('token'));
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', c.get('userId'))
    .select('*')
    .single();

  if (error) throw error;

  return c.json({ profile: data });
});

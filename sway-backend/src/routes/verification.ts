/**
 * Student ID verification
 *
 * POST /verification        upload a student ID card for review (any signed-in user)
 * GET  /verification/me     own status
 * GET  /admin/verifications pending queue (admins only)
 * POST /admin/verifications/:id  approve or reject (admins only)
 *
 * Images live in a private Supabase Storage bucket. Admins see them through
 * short-lived signed URLs, and the file is deleted as soon as a decision is made.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabaseAdmin } from '../lib/db';
import { requireAuth } from '../middleware/auth';
import { collegeForUserId, latestVerification } from '../lib/verification';
import { isAdminUser } from '../lib/admin';
import type { AppEnv } from '../types';

const BUCKET = 'id-cards';
const MAX_BYTES = 4 * 1024 * 1024;

const uploadSchema = z.object({
  collegeId: z.string().uuid(),
  image: z.string().min(32).max(8_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().max(300).optional(),
});

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function readJson(c: any): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

async function ensureBucket(supabase: ReturnType<typeof getSupabaseAdmin>) {
  try {
    await supabase.storage.createBucket(BUCKET, { public: false });
  } catch {
    // already exists / not permitted - upload below reports the real problem
  }
}

function decodeBase64Image(dataUrl: string, mimeType: string) {
  const raw = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { bytes, mimeType };
}

export const verificationRoutes = new Hono<AppEnv>();

// Own verification status (used by onboarding)
verificationRoutes.get('/me', requireAuth, async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  const userId = c.get('userId');

  const [college, request] = await Promise.all([
    collegeForUserId(supabase, userId),
    latestVerification(supabase, userId),
  ]);

  return c.json({
    status: request?.status ?? ('none' as const),
    note: request?.note ?? null,
    requestId: request?.id ?? null,
    reviewedAt: request?.reviewed_at ?? null,
    emailDomainVerified: Boolean(college),
    emailCollege: college ? { id: college.id, name: college.name } : null,
  });
});

// Submit a student ID for review
verificationRoutes.post('/', requireAuth, async (c) => {
  const parsed = uploadSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Attach a photo of your student ID', code: 'invalid_upload' }, 400);
  }

  const supabase = getSupabaseAdmin(c.env);
  const userId = c.get('userId');

  const { bytes } = decodeBase64Image(parsed.data.image, parsed.data.mimeType);
  if (bytes.byteLength > MAX_BYTES) {
    return c.json({ error: 'That image is too large. Use one under 4 MB.', code: 'too_large' }, 413);
  }

  // College must exist so the admin knows what they are approving
  const { data: college } = await supabase
    .from('colleges')
    .select('id, name')
    .eq('id', parsed.data.collegeId)
    .eq('is_active', true)
    .maybeSingle();

  if (!college) {
    return c.json({ error: 'Pick your college first', code: 'college_not_found' }, 404);
  }

  await ensureBucket(supabase);

  const path = `${userId}/${Date.now()}.${EXT[parsed.data.mimeType]}`;
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: parsed.data.mimeType, upsert: true });

  if (upload.error) {
    return c.json(
      { error: 'Could not store the image. Try again in a moment.', code: 'storage_failed' },
      502
    );
  }

  const { data, error } = await supabase
    .from('verification_requests')
    .insert({
      user_id: userId,
      college_id: parsed.data.collegeId,
      image_path: path,
      status: 'pending',
    })
    .select('id, status, created_at')
    .single();

  if (error) {
    // Tables not created yet - tell the client instead of pretending success
    return c.json(
      { error: 'ID verification is not set up on the server yet', code: 'verification_unavailable' },
      503
    );
  }

  return c.json({ request: data }, 201);
});

// Admin: queue counters for the dashboard
verificationRoutes.get('/admin/counts', requireAuth, async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  if (!(await isAdminUser(supabase, c.env, c.get('userId')))) {
    return c.json({ error: 'Not allowed' }, 403);
  }

  const counts: Record<string, number> = {};
  for (const status of ['pending', 'approved', 'rejected']) {
    const { count } = await supabase
      .from('verification_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    counts[status] = count ?? 0;
  }

  return c.json({ counts });
});

// Admin: pending queue with short-lived preview links
verificationRoutes.get('/admin/list', requireAuth, async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  if (!(await isAdminUser(supabase, c.env, c.get('userId')))) {
    return c.json({ error: 'Not allowed' }, 403);
  }

  const status = c.req.query('status') || 'pending';
  const { data, error } = await supabase
    .from('verification_requests')
    .select('id, user_id, college_id, image_path, status, note, created_at, reviewed_at')
    .eq('status', status)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    return c.json({ requests: [], unavailable: true });
  }

  const requests = await Promise.all(
    (data ?? []).map(async (row) => {
      const [{ data: signed }, { data: college }, { data: user }, { data: profile }] =
        await Promise.all([
          supabase.storage.from(BUCKET).createSignedUrl(row.image_path, 600),
          supabase.from('colleges').select('name').eq('id', row.college_id).maybeSingle(),
          supabase.auth.admin.getUserById(row.user_id),
          supabase.from('profiles').select('username').eq('id', row.user_id).maybeSingle(),
        ]);

      return {
        id: row.id,
        status: row.status,
        note: row.note,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at ?? null,
        collegeName: college?.name ?? null,
        username: profile?.username ?? null,
        email: user?.user?.email ?? null,
        imageUrl: signed?.signedUrl ?? null,
      };
    })
  );

  return c.json({ requests });
});

// Admin: approve or reject
verificationRoutes.post('/admin/:id', requireAuth, async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  if (!(await isAdminUser(supabase, c.env, c.get('userId')))) {
    return c.json({ error: 'Not allowed' }, 403);
  }

  const parsed = reviewSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Choose approve or reject' }, 400);
  }

  const id = c.req.param('id');
  const status = parsed.data.action === 'approve' ? 'approved' : 'rejected';

  const { data: row, error } = await supabase
    .from('verification_requests')
    .select('id, image_path')
    .eq('id', id)
    .maybeSingle();

  if (error || !row) {
    return c.json({ error: 'Request not found' }, 404);
  }

  const update = await supabase
    .from('verification_requests')
    .update({
      status,
      note: parsed.data.note ?? null,
      reviewed_by: c.get('userId'),
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (update.error) {
    return c.json({ error: 'Could not update the request' }, 500);
  }

  // Do not keep ID images once a decision is made
  try {
    await supabase.storage.from(BUCKET).remove([row.image_path]);
  } catch {
    // best effort
  }

  return c.json({ success: true, status });
});

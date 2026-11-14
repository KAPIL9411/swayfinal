/**
 * Vibes (secret matching) routes
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { getSupabaseAdmin, getSupabaseUser } from '../lib/db';
import { isVerifiedStudent } from '../lib/verification';
import type { AppEnv } from '../types';

export const vibesRoutes = new Hono<AppEnv>();

async function readJson(c: any): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

// How many people secretly vibed me (never who)
vibesRoutes.get('/count', requireAuth, async (c) => {
  const supabase = getSupabaseUser(c.env, c.get('token'));
  const { data, error } = await supabase.rpc('my_secret_vibe_count');

  if (error) throw error;

  return c.json({ count: (data as number) ?? 0 });
});

// Vibes I sent
vibesRoutes.get('/sent', requireAuth, async (c) => {
  const supabase = getSupabaseUser(c.env, c.get('token'));
  const { data, error } = await supabase.rpc('my_sent_vibes');

  if (error) throw error;

  return c.json({ vibes: data ?? [] });
});

vibesRoutes.post('/send', requireAuth, async (c) => {
  const body = await readJson(c);
  const targetId = body.targetId;

  if (typeof targetId !== 'string' || !targetId) {
    return c.json({ error: 'Target ID required' }, 400);
  }

  if (!(await isVerifiedStudent(getSupabaseAdmin(c.env), c.get('userId')))) {
    return c.json(
      { error: 'Verify your student ID to send vibes', code: 'verification_required' },
      403
    );
  }

  const supabase = getSupabaseUser(c.env, c.get('token'));

  const { data, error } = await supabase.rpc('send_vibe', { p_target: targetId });

  if (error) throw error;

  const result = (data ?? {}) as { matched?: boolean; match_id?: string };

  return c.json({ matched: Boolean(result.matched), matchId: result.match_id });
});

vibesRoutes.post('/withdraw', requireAuth, async (c) => {
  const body = await readJson(c);
  const targetId = body.targetId;

  if (typeof targetId !== 'string' || !targetId) {
    return c.json({ error: 'Target ID required' }, 400);
  }

  const supabase = getSupabaseUser(c.env, c.get('token'));
  const { error } = await supabase.rpc('withdraw_vibe', { p_target: targetId });

  if (error) throw error;

  return c.json({ success: true });
});

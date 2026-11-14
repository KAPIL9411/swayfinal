/**
 * Reports (safety)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { getSupabaseUser } from '../lib/db';
import type { AppEnv } from '../types';

export const reportsRoutes = new Hono<AppEnv>();

const reportSchema = z.object({
  targetType: z.enum(['post', 'comment', 'profile', 'message']),
  targetId: z.string().uuid(),
  reason: z.enum([
    'spam',
    'harassment',
    'hate_speech',
    'sexual_content',
    'violence',
    'impersonation',
    'self_harm',
    'threat_or_self_harm',
    'minor_safety',
    'other',
  ]),
  details: z.string().max(500).optional(),
});

reportsRoutes.post('/', requireAuth, async (c) => {
  let body: unknown = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid report' }, 400);
  }

  const supabase = getSupabaseUser(c.env, c.get('token'));

  const { error } = await supabase.from('reports').insert({
    reporter_id: c.get('userId'),
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
  });

  // One report per user per target - treat a repeat as success
  if (error && error.code !== '23505') throw error;

  return c.json({ success: true });
});

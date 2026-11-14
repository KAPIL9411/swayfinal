/**
 * Comments routes
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { getSupabaseAdmin, getSupabaseUser } from '../lib/db';
import { isVerifiedStudent } from '../lib/verification';
import type { AppEnv } from '../types';

export const commentsRoutes = new Hono<AppEnv>();

const createCommentSchema = z.object({
  postId: z.string().uuid(),
  body: z.string().trim().min(1).max(300),
  parentId: z.string().uuid().nullish(),
});

async function readJson(c: any): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

commentsRoutes.get('/:postId', requireAuth, async (c) => {
  const supabase = getSupabaseUser(c.env, c.get('token'));

  const { data, error } = await supabase
    .from('comments_feed')
    .select('*')
    .eq('post_id', c.req.param('postId'))
    .order('created_at', { ascending: true });

  if (error) throw error;

  return c.json({ comments: data ?? [] });
});

commentsRoutes.post('/', requireAuth, async (c) => {
  const parsed = createCommentSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Comment must be 1-300 characters' }, 400);
  }

  if (!(await isVerifiedStudent(getSupabaseAdmin(c.env), c.get('userId')))) {
    return c.json(
      { error: 'Verify your student ID to comment', code: 'verification_required' },
      403
    );
  }

  const supabase = getSupabaseUser(c.env, c.get('token'));

  const { data, error } = await supabase.rpc('create_comment', {
    p_post: parsed.data.postId,
    p_body: parsed.data.body,
    p_parent: parsed.data.parentId ?? null,
  });

  if (error) throw error;

  return c.json({ commentId: data as string }, 201);
});

/**
 * Posts routes (Vibe Wall)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { getSupabaseAdmin, getSupabaseUser } from '../lib/db';
import { isVerifiedStudent } from '../lib/verification';
import type { AppEnv } from '../types';

export const postsRoutes = new Hono<AppEnv>();

const categories = ['confession', 'question', 'opinion', 'event', 'meme', 'lost_found'] as const;
const reactionKinds = ['fire', 'heart', 'laugh', 'wow', 'sad'] as const;

const createPostSchema = z.object({
  category: z.enum(categories),
  body: z.string().trim().min(1).max(500),
  image: z.string().url().max(2048).optional(),
});

async function readJson(c: any): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

/** Recompute a post's reaction count from the reactions table. */
async function refreshReactionCount(admin: ReturnType<typeof getSupabaseAdmin>, postId: string) {
  const { count } = await admin
    .from('reactions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  const reactionCount = count ?? 0;
  await admin.from('posts').update({ reaction_count: reactionCount }).eq('id', postId);
  return reactionCount;
}

// Feed (scoped to the caller's college by the posts_feed view)
postsRoutes.get('/', requireAuth, async (c) => {
  const supabase = getSupabaseUser(c.env, c.get('token'));

  const { data, error } = await supabase
    .from('posts_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  const posts = data ?? [];

  // Which of these posts did I react to, and how?
  let reactions: { post_id: string; kind: string }[] = [];
  if (posts.length > 0) {
    const { data: mine } = await supabase
      .from('reactions')
      .select('post_id, kind')
      .in(
        'post_id',
        posts.map((p: { id: string }) => p.id)
      );
    reactions = mine ?? [];
  }

  const byPost = new Map(reactions.map((r) => [r.post_id, r.kind]));

  return c.json({
    posts: posts.map((post: Record<string, unknown>) => ({
      ...post,
      my_reaction: byPost.get(post.id as string) ?? null,
    })),
  });
});

// Single post
postsRoutes.get('/:id', requireAuth, async (c) => {
  const supabase = getSupabaseUser(c.env, c.get('token'));

  const { data, error } = await supabase
    .from('posts_feed')
    .select('*')
    .eq('id', c.req.param('id'))
    .maybeSingle();

  if (error) throw error;
  if (!data) return c.json({ error: 'Post not found' }, 404);

  const { data: mine } = await supabase
    .from('reactions')
    .select('kind')
    .eq('post_id', data.id)
    .maybeSingle();

  return c.json({ post: { ...data, my_reaction: mine?.kind ?? null } });
});

// Create post
postsRoutes.post('/', requireAuth, async (c) => {
  const parsed = createPostSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  if (!(await isVerifiedStudent(getSupabaseAdmin(c.env), c.get('userId')))) {
    return c.json(
      { error: 'Verify your student ID to post', code: 'verification_required' },
      403
    );
  }

  const supabase = getSupabaseUser(c.env, c.get('token'));

  const { data, error } = await supabase.rpc('create_post', {
    p_category: parsed.data.category,
    p_body: parsed.data.body,
    p_image: parsed.data.image ?? null,
  });

  if (error) throw error;

  return c.json({ postId: data as string }, 201);
});

// React to a post
postsRoutes.post('/:id/react', requireAuth, async (c) => {
  const body = await readJson(c);
  const kind = body.kind;

  if (typeof kind !== 'string' || !reactionKinds.includes(kind as (typeof reactionKinds)[number])) {
    return c.json({ error: 'Invalid reaction kind' }, 400);
  }

  const postId = c.req.param('id');
  const userId = c.get('userId');
  const supabase = getSupabaseUser(c.env, c.get('token'));

  const { error } = await supabase
    .from('reactions')
    .upsert({ post_id: postId, user_id: userId, kind }, { onConflict: 'post_id,user_id' });

  if (error) throw error;

  const reactionCount = await refreshReactionCount(getSupabaseAdmin(c.env), postId);

  return c.json({ success: true, reactionCount, myReaction: kind });
});

// Remove reaction
postsRoutes.delete('/:id/react', requireAuth, async (c) => {
  const postId = c.req.param('id');
  const supabase = getSupabaseUser(c.env, c.get('token'));

  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', c.get('userId'));

  if (error) throw error;

  const reactionCount = await refreshReactionCount(getSupabaseAdmin(c.env), postId);

  return c.json({ success: true, reactionCount, myReaction: null });
});

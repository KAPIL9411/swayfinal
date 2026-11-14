/**
 * Matches & messages (chat opens only after a mutual vibe)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { getSupabaseAdmin } from '../lib/db';
import type { AppEnv } from '../types';

export const matchesRoutes = new Hono<AppEnv>();

type MatchRow = { id: string; user_a: string; user_b: string; created_at: string };

async function readJson(c: any): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

/** Returns the match if the caller is one of its participants, else null. */
async function getMembership(
  admin: ReturnType<typeof getSupabaseAdmin>,
  matchId: string,
  userId: string
): Promise<MatchRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(matchId)) return null;

  const { data } = await admin
    .from('matches')
    .select('id, user_a, user_b, created_at')
    .eq('id', matchId)
    .maybeSingle();

  if (!data) return null;
  if (data.user_a !== userId && data.user_b !== userId) return null;
  return data;
}

matchesRoutes.get('/', requireAuth, async (c) => {
  const userId = c.get('userId');
  const admin = getSupabaseAdmin(c.env);

  const { data: matches, error } = await admin
    .from('matches')
    .select('id, user_a, user_b, created_at')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (matches ?? []) as MatchRow[];
  if (rows.length === 0) return c.json({ matches: [] });

  const otherIds = rows.map((m) => (m.user_a === userId ? m.user_b : m.user_a));
  const matchIds = rows.map((m) => m.id);

  const [{ data: profiles }, { data: messages }] = await Promise.all([
    admin
      .from('profiles')
      .select('id, username, avatar_key, bio, year_of_study, branch, interests, looking_for')
      .in('id', otherIds),
    admin
      .from('messages')
      .select('id, match_id, sender_id, body, created_at, read_at')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const lastByMatch = new Map<string, any>();
  const unreadByMatch = new Map<string, number>();

  for (const message of messages ?? []) {
    if (!lastByMatch.has(message.match_id)) lastByMatch.set(message.match_id, message);
    if (message.sender_id !== userId && !message.read_at) {
      unreadByMatch.set(message.match_id, (unreadByMatch.get(message.match_id) ?? 0) + 1);
    }
  }

  return c.json({
    matches: rows.map((match) => {
      const otherId = match.user_a === userId ? match.user_b : match.user_a;
      const profile = profileById.get(otherId);
      return {
        id: match.id,
        createdAt: match.created_at,
        profile: profile
          ? {
              id: profile.id,
              username: profile.username,
              avatarKey: profile.avatar_key,
              bio: profile.bio,
              yearOfStudy: profile.year_of_study,
              branch: profile.branch,
              interests: profile.interests ?? [],
              lookingFor: profile.looking_for,
            }
          : null,
        lastMessage: lastByMatch.get(match.id) ?? null,
        unreadCount: unreadByMatch.get(match.id) ?? 0,
      };
    }),
  });
});

matchesRoutes.get('/:id/messages', requireAuth, async (c) => {
  const admin = getSupabaseAdmin(c.env);
  const match = await getMembership(admin, c.req.param('id'), c.get('userId'));
  if (!match) return c.json({ error: 'Match not found' }, 404);

  const { data, error } = await admin
    .from('messages')
    .select('id, match_id, sender_id, body, created_at, read_at')
    .eq('match_id', match.id)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) throw error;

  return c.json({ messages: data ?? [] });
});

matchesRoutes.post('/:id/messages', requireAuth, async (c) => {
  const parsed = z
    .object({ body: z.string().trim().min(1).max(1000) })
    .safeParse(await readJson(c));

  if (!parsed.success) return c.json({ error: 'Message must be 1-1000 characters' }, 400);

  const admin = getSupabaseAdmin(c.env);
  const match = await getMembership(admin, c.req.param('id'), c.get('userId'));
  if (!match) return c.json({ error: 'Match not found' }, 404);

  const { data, error } = await admin
    .from('messages')
    .insert({ match_id: match.id, sender_id: c.get('userId'), body: parsed.data.body })
    .select('id, match_id, sender_id, body, created_at, read_at')
    .single();

  if (error) throw error;

  return c.json({ message: data }, 201);
});

matchesRoutes.post('/:id/read', requireAuth, async (c) => {
  const admin = getSupabaseAdmin(c.env);
  const match = await getMembership(admin, c.req.param('id'), c.get('userId'));
  if (!match) return c.json({ error: 'Match not found' }, 404);

  const { error } = await admin
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('match_id', match.id)
    .is('read_at', null)
    .neq('sender_id', c.get('userId'));

  if (error) throw error;

  return c.json({ success: true });
});

matchesRoutes.post('/:id/unmatch', requireAuth, async (c) => {
  const admin = getSupabaseAdmin(c.env);
  const match = await getMembership(admin, c.req.param('id'), c.get('userId'));
  if (!match) return c.json({ error: 'Match not found' }, 404);

  const { error } = await admin.from('matches').update({ is_active: false }).eq('id', match.id);
  if (error) throw error;

  return c.json({ success: true });
});

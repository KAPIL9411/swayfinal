/**
 * Discover routes - same college, discoverable, not blocked.
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { getSupabaseAdmin } from '../lib/db';
import type { AppEnv } from '../types';

export const discoverRoutes = new Hono<AppEnv>();

type ProfileRow = {
  id: string;
  username: string;
  avatar_key: string;
  bio: string | null;
  year_of_study: number | null;
  branch: string | null;
  interests: string[];
  looking_for: 'friends' | 'dating' | 'both';
  created_at: string;
};

discoverRoutes.get('/', requireAuth, async (c) => {
  const userId = c.get('userId');
  const admin = getSupabaseAdmin(c.env);

  const { data: me, error: meError } = await admin
    .from('profiles')
    .select('id, college_id, interests')
    .eq('id', userId)
    .maybeSingle();

  if (meError) throw meError;
  if (!me) return c.json({ error: 'Complete onboarding first' }, 403);

  // Nobody blocked in either direction should show up
  const { data: blocks } = await admin
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  const blockedIds = new Set<string>();
  for (const block of blocks ?? []) {
    blockedIds.add(block.blocker_id === userId ? block.blocked_id : block.blocker_id);
  }

  const interestFilter = c.req.query('interests');
  const yearFilter = c.req.query('year');
  const lookingFor = c.req.query('lookingFor');

  let query = admin
    .from('profiles')
    .select('id, username, avatar_key, bio, year_of_study, branch, interests, looking_for, created_at')
    .eq('college_id', me.college_id)
    .eq('is_discoverable', true)
    .eq('status', 'active')
    .is('deleted_at', null)
    .neq('id', userId)
    .limit(100);

  if (yearFilter && /^[1-7]$/.test(yearFilter)) {
    query = query.eq('year_of_study', Number(yearFilter));
  }

  if (lookingFor === 'friends' || lookingFor === 'dating' || lookingFor === 'both') {
    query = query.eq('looking_for', lookingFor);
  }

  if (interestFilter) {
    const interests = interestFilter
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);
    if (interests.length > 0) {
      query = query.overlaps('interests', interests);
    }
  }

  const { data: profiles, error } = await query;
  if (error) throw error;

  // Vibes I already sent, so the UI can show "vibe sent"
  const { data: sentVibes } = await admin
    .from('vibes')
    .select('receiver_id')
    .eq('sender_id', userId);
  const sentTo = new Set((sentVibes ?? []).map((v) => v.receiver_id));

  const myInterests = new Set((me.interests as string[]) ?? []);

  const results = ((profiles ?? []) as ProfileRow[])
    .filter((p) => !blockedIds.has(p.id))
    .map((p) => {
      const shared = (p.interests ?? []).filter((i) => myInterests.has(i));
      return {
        id: p.id,
        username: p.username,
        avatarKey: p.avatar_key,
        bio: p.bio,
        yearOfStudy: p.year_of_study,
        branch: p.branch,
        interests: p.interests ?? [],
        lookingFor: p.looking_for,
        sharedInterests: shared,
        vibeSent: sentTo.has(p.id),
        joinedAt: p.created_at,
      };
    })
    .sort((a, b) => b.sharedInterests.length - a.sharedInterests.length || a.username.localeCompare(b.username))
    .slice(0, 50);

  return c.json({ profiles: results });
});

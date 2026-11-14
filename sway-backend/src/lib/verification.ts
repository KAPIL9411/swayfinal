/**
 * Student verification helpers
 *
 * Two ways a student can become verified:
 *  1. Email: their login email belongs to a registered college domain.
 *  2. ID card: they uploaded a student ID and an admin approved it.
 *
 * Everything degrades gracefully: if the verification tables have not been
 * created yet, calls return null instead of throwing, so the email path keeps
 * working.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export async function collegeForEmailDomain(
  supabase: SupabaseClient,
  email: string | null | undefined
) {
  const domain = email?.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  const { data } = await supabase
    .from('colleges')
    .select('id, name, city, state')
    .contains('email_domains', [domain])
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

/** The college matched by the caller's login email, if any. */
export async function collegeForUserId(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.auth.admin.getUserById(userId);
  return collegeForEmailDomain(supabase, data?.user?.email ?? null);
}

export async function latestVerification(supabase: SupabaseClient, userId: string) {
  try {
    const { data, error } = await supabase
      .from('verification_requests')
      .select('id, status, note, college_id, created_at, reviewed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * A verified student is either an admin-approved ID holder or someone whose
 * login email belongs to a registered college domain (legacy email accounts).
 */
export async function isVerifiedStudent(supabase: SupabaseClient, userId: string) {
  if (await hasApprovedVerification(supabase, userId)) return true;
  return Boolean(await collegeForUserId(supabase, userId).catch(() => null));
}

export async function hasApprovedVerification(supabase: SupabaseClient, userId: string) {
  try {
    const { data, error } = await supabase
      .from('verification_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();

    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

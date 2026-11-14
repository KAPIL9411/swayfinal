/**
 * Admin check
 *
 * An account counts as admin when either:
 *  1. profiles.is_admin is true (set from SQL), or
 *  2. its email is listed in the ADMIN_EMAILS worker variable.
 *
 * (2) exists so the first admin can be created before the migration that adds
 * the column is applied.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bindings } from '../types';

export function adminEmails(env: Pick<Bindings, 'ADMIN_EMAILS'>) {
  return (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdminUser(
  supabase: SupabaseClient,
  env: Pick<Bindings, 'ADMIN_EMAILS'>,
  userId: string
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.is_admin) return true;

  const allowed = adminEmails(env);
  if (allowed.length === 0) return false;

  const { data } = await supabase.auth.admin.getUserById(userId);
  const email = data?.user?.email?.toLowerCase();
  return Boolean(email && allowed.includes(email));
}

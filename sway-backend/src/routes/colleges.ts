/**
 * Colleges (public - needed before the user has an account)
 */

import { Hono } from 'hono';
import { getSupabaseAdmin } from '../lib/db';
import type { AppEnv } from '../types';

export const collegesRoutes = new Hono<AppEnv>();

collegesRoutes.get('/', async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  const { data, error } = await supabase
    .from('colleges')
    .select('id, name, city, state')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  return c.json({ colleges: data ?? [] });
});

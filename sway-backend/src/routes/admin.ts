/**
 * Admin maintenance endpoints
 *
 * POST   /admin/colleges/import   bulk add colleges (max 500 rows per call)
 * DELETE /admin/colleges/:id      remove a college (test/junk rows)
 *
 * Used by sway-backend/scripts/import-colleges.mjs to seed the AISHE directory.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabaseAdmin } from '../lib/db';
import { requireAuth } from '../middleware/auth';
import { isAdminUser } from '../lib/admin';
import type { AppEnv } from '../types';

export const adminRoutes = new Hono<AppEnv>();

const importSchema = z.object({
  colleges: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(200),
        city: z.string().trim().max(120).nullish(),
        state: z.string().trim().max(120).nullish(),
      })
    )
    .min(1)
    .max(500),
});

async function readJson(c: any): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

adminRoutes.post('/colleges/import', requireAuth, async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  if (!(await isAdminUser(supabase, c.env, c.get('userId')))) {
    return c.json({ error: 'Not allowed' }, 403);
  }

  const parsed = importSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid batch', details: parsed.error.flatten() }, 400);
  }

  const batch = parsed.data.colleges;

  // Skip rows that already exist (exact name + state), so re-running the import
  // is safe.
  const { data: existing } = await supabase
    .from('colleges')
    .select('name, state')
    .in(
      'name',
      batch.map((college) => college.name)
    );

  const seen = new Set((existing ?? []).map((row) => `${row.name}|${row.state ?? ''}`));

  const rows = batch
    .filter((college) => !seen.has(`${college.name}|${college.state ?? ''}`))
    .map((college) => ({
      name: college.name,
      city: college.city ?? null,
      state: college.state ?? null,
      email_domains: [] as string[],
      is_active: true,
    }));

  if (rows.length === 0) {
    return c.json({ inserted: 0, skipped: batch.length });
  }

  const { error } = await supabase.from('colleges').insert(rows);
  if (error) throw error;

  return c.json({ inserted: rows.length, skipped: batch.length - rows.length });
});

adminRoutes.delete('/colleges/:id', requireAuth, async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  if (!(await isAdminUser(supabase, c.env, c.get('userId')))) {
    return c.json({ error: 'Not allowed' }, 403);
  }

  const id = c.req.param('id');

  // Refuse to delete a campus that students are already attached to
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('college_id', id);

  if ((count ?? 0) > 0) {
    // Never orphan students: hide the campus instead of deleting the row
    const { error } = await supabase.from('colleges').update({ is_active: false }).eq('id', id);
    if (error) throw error;
    return c.json({ success: true, deactivated: true, students: count });
  }

  const { error } = await supabase.from('colleges').delete().eq('id', id);
  if (error) throw error;

  return c.json({ success: true });
});

adminRoutes.get('/colleges/count', requireAuth, async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  if (!(await isAdminUser(supabase, c.env, c.get('userId')))) {
    return c.json({ error: 'Not allowed' }, 403);
  }

  const { count } = await supabase
    .from('colleges')
    .select('*', { count: 'exact', head: true });

  return c.json({ count: count ?? 0 });
});

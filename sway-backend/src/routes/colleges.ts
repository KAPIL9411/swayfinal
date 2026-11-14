/**
 * Colleges (public - needed before the user has an account)
 *
 * GET /colleges?q=iit&limit=30&offset=0
 * GET /colleges/:id
 *
 * The table holds ~50k institutions, so the list is always paginated and
 * searched on the server. Without a query we return the curated campuses (the
 * ones with an email domain on file), falling back to A-Z.
 */

import { Hono } from 'hono';
import { getSupabaseAdmin } from '../lib/db';
import type { AppEnv } from '../types';

export const collegesRoutes = new Hono<AppEnv>();

const FIELDS = 'id, name, city, state';

/** Students type short forms; the AISHE directory spells names out in full. */
const ALIASES: Record<string, string> = {
  iit: 'indian institute of technology',
  nit: 'national institute of technology',
  iiit: 'indian institute of information technology',
  iim: 'indian institute of management',
  aiims: 'all india institute of medical sciences',
  nlu: 'national law university',
  du: 'university of delhi',
  bhu: 'banaras hindu university',
  jnu: 'jawaharlal nehru university',
  au: 'university',
  nitr: 'national institute of technology',
};

function clampLimit(value: string | undefined) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(Math.max(parsed, 1), 100);
}

collegesRoutes.get('/', async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  const query = (c.req.query('q') ?? '').trim();
  const limit = clampLimit(c.req.query('limit'));
  const offset = Math.max(Number.parseInt(c.req.query('offset') ?? '0', 10) || 0, 0);

  if (query.length >= 2) {
    const safe = query.replace(/[%,()]/g, ' ').trim();
    const alias = ALIASES[safe.toLowerCase()];
    const terms = alias ? [safe, alias] : [safe];

    const filter = terms
      .flatMap((term) => [
        `name.ilike.%${term}%`,
        `city.ilike.%${term}%`,
        `state.ilike.%${term}%`,
      ])
      .join(',');

    const { data, error } = await supabase
      .from('colleges')
      .select(FIELDS)
      .eq('is_active', true)
      .or(filter)
      .order('name')
      .limit(Math.min(200, limit * 5));

    if (error) throw error;

    // Rank: name starts with the query, then contains it, then everything else
    // (city/state matches). Alphabetical order alone buried the real IITs
    // under every "... Institute of Technology" in the directory.
    const termsLower = terms.map((term) => term.toLowerCase());
    const rank = (name: string) => {
      const lower = name.toLowerCase();
      if (termsLower.some((term) => lower.startsWith(term))) return 0;
      if (termsLower.some((term) => lower.includes(term))) return 1;
      return 2;
    };

    const ranked = (data ?? [])
      .map((college) => ({ college, r: rank(college.name) }))
      .sort((a, b) => a.r - b.r || a.college.name.localeCompare(b.college.name))
      .map((entry) => entry.college)
      .slice(offset, offset + limit);

    return c.json({ colleges: ranked, query });
  }

  // No query: curated campuses first (they carry email domains), then A-Z.
  const curated = await supabase
    .from('colleges')
    .select(FIELDS)
    .eq('is_active', true)
    .not('email_domains', 'eq', '{}')
    .order('name')
    .limit(limit);

  if (!curated.error && (curated.data?.length ?? 0) > 0) {
    return c.json({ colleges: curated.data ?? [], query });
  }

  const { data, error } = await supabase
    .from('colleges')
    .select(FIELDS)
    .eq('is_active', true)
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return c.json({ colleges: data ?? [], query });
});

collegesRoutes.get('/:id', async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  const { data, error } = await supabase
    .from('colleges')
    .select(FIELDS)
    .eq('id', c.req.param('id'))
    .maybeSingle();

  if (error) throw error;
  if (!data) return c.json({ error: 'College not found' }, 404);

  return c.json({ college: data });
});

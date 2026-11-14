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

/** Old/new city spellings and common nicknames used inside college names. */
const PLACE_ALIASES: Record<string, string> = {
  trichy: 'tiruchirapalli',
  bombay: 'mumbai',
  bangalore: 'bengaluru',
  madras: 'chennai',
  calcutta: 'kolkata',
  gurgaon: 'gurugram',
  vizag: 'visakhapatnam',
  cochin: 'kochi',
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
    const safe = query.replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = safe.split(' ').filter(Boolean);

    // Every word gets its variants: the raw word plus an abbreviation or city
    // expansion ("iit" -> "indian institute of technology", "trichy" ->
    // "tiruchirapalli"). Two-letter words only use the expansion, otherwise
    // "du" matches every "EDUCATION" in the directory.
    const groups = words.map((word) => {
      const key = word.toLowerCase();
      const expansion = ALIASES[key] ?? PLACE_ALIASES[key] ?? null;
      if (!expansion) return [word];
      return key.length <= 2 ? [expansion] : [word, expansion];
    });

    const filter = groups
      .flat()
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
      .limit(Math.min(400, limit * 10));

    if (error) throw error;

    const lower = (value: string | null) => (value ?? '').toLowerCase();

    // Every word must appear somewhere: "iit kharagpur" has to match the row's
    // expanded name even when the directory writes it with a comma.
    const matches = (data ?? []).filter((college) => {
      const haystack = `${lower(college.name)} ${lower(college.city)} ${lower(college.state)}`;
      return groups.every((group) => group.some((term) => haystack.includes(term.toLowerCase())));
    });

    // Rank: name starts with what was typed, then contains it, then the rest.
    const rank = (name: string) => {
      for (const group of groups) {
        for (const term of group) {
          const value = term.toLowerCase();
          if (lower(name).startsWith(value)) return 0;
          if (lower(name).includes(value)) return 1;
        }
      }
      return 2;
    };

    const ranked = matches
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

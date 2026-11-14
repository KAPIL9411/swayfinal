/**
 * Global error handler
 */

import { Context } from 'hono';

/** Application error codes raised by the database functions. */
const SQLSTATE_MESSAGES: Record<string, { status: number; error: string }> = {
  account_restricted: { status: 403, error: 'Account restricted' },
  rate_limited: { status: 429, error: 'Rate limit exceeded' },
  daily_limit: { status: 429, error: 'Daily vibe limit reached' },
  not_found: { status: 404, error: 'Not found' },
  invalid: { status: 400, error: 'Invalid request' },
};

export function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  const message = err?.message ?? '';

  for (const [code, mapped] of Object.entries(SQLSTATE_MESSAGES)) {
    if (message.includes(code)) {
      return c.json({ error: mapped.error, code }, mapped.status as 400);
    }
  }

  // PostgreSQL errors
  if (message.includes('duplicate key') || message.includes('23505')) {
    return c.json({ error: 'Duplicate entry' }, 409);
  }

  if (message.includes('23503')) {
    return c.json({ error: 'Related resource not found' }, 404);
  }

  return c.json({ error: 'Internal server error' }, 500);
}

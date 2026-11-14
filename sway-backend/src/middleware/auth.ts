/**
 * Authentication middleware
 * Verifies Supabase JWT tokens and exposes the caller's token so routes can
 * query Postgres as that user (RLS + auth.uid()).
 */

import type { MiddlewareHandler } from 'hono';
import { getSupabaseAdmin } from '../lib/db';
import type { AppEnv } from '../types';

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7).trim();
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const supabase = getSupabaseAdmin(c.env);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    c.set('userId', user.id);
    c.set('token', token);
    c.set('userEmail', user.email);

    return await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
};

/** Optional auth - attaches the user when a valid token is present. */
export const optionalAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const supabase = getSupabaseAdmin(c.env);
      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      if (user) {
        c.set('userId', user.id);
        c.set('token', token);
        c.set('userEmail', user.email);
      }
    } catch {
      // Ignore errors for optional auth
    }
  }

  return await next();
};

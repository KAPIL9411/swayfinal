/**
 * Database clients (Supabase PostgreSQL)
 *
 * - admin client: service role, bypasses RLS. Use only for server-side
 *   operations that cannot be expressed through RLS (profile creation,
 *   counter maintenance, cross-table joins for the current user).
 * - user client: service role key for the API key, but the caller's JWT in
 *   the Authorization header, so PostgREST evaluates RLS and auth.uid()
 *   exactly like a normal signed-in client. All per-user reads/writes go
 *   through this client.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Bindings } from '../types';

export function getSupabaseAdmin(env: Pick<Bindings, 'SUPABASE_URL' | 'SUPABASE_SERVICE_KEY'>): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });
}

export function getSupabaseUser(env: Pick<Bindings, 'SUPABASE_URL' | 'SUPABASE_SERVICE_KEY'>, token: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          college_id: string;
          username: string;
          avatar_key: string;
          bio: string | null;
          year_of_study: number | null;
          branch: string | null;
          interests: string[];
          looking_for: 'friends' | 'dating' | 'both';
          is_discoverable: boolean;
          status: 'active' | 'muted' | 'suspended' | 'banned';
          created_at: string;
        };
      };
      posts: {
        Row: {
          id: string;
          college_id: string;
          category: string;
          body: string;
          image_path: string | null;
          reaction_count: number;
          comment_count: number;
          created_at: string;
        };
      };
      colleges: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          state: string | null;
          email_domains: string[];
          is_active: boolean;
        };
      };
    };
    Functions: {
      create_post: {
        Args: { p_category: string; p_body: string; p_image?: string | null };
        Returns: string;
      };
      create_comment: {
        Args: { p_post: string; p_body: string; p_parent?: string | null };
        Returns: string;
      };
      send_vibe: {
        Args: { p_target: string };
        Returns: { matched: boolean; match_id?: string };
      };
    };
  };
};

/**
 * Session storage
 *
 * The app talks only to the SWAY Worker. The Worker returns Supabase session
 * tokens, which we keep in secure storage and send as `Authorization: Bearer`.
 * Access tokens are refreshed through the Worker, so no Supabase URL/key ever
 * ships in the app bundle.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL } from './config';

const STORAGE_KEY = 'sway.session';
const isWeb = Platform.OS === 'web';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds */
  expiresAt: number;
  userId: string;
}

let cached: StoredSession | null = null;
let loaded = false;
const listeners = new Set<(session: StoredSession | null) => void>();

function notify(session: StoredSession | null) {
  listeners.forEach((listener) => listener(session));
}

export function subscribeSession(listener: (session: StoredSession | null) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function readRaw(): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writeRaw(value: string | null): Promise<void> {
  if (isWeb) {
    try {
      if (value === null) globalThis.localStorage?.removeItem(STORAGE_KEY);
      else globalThis.localStorage?.setItem(STORAGE_KEY, value);
    } catch {
      // Storage may be unavailable (private mode) - session stays in memory
    }
    return;
  }

  if (value === null) await SecureStore.deleteItemAsync(STORAGE_KEY);
  else await SecureStore.setItemAsync(STORAGE_KEY, value);
}

export async function getSession(): Promise<StoredSession | null> {
  if (!loaded) {
    loaded = true;
    const raw = await readRaw();
    if (raw) {
      try {
        cached = JSON.parse(raw) as StoredSession;
      } catch {
        cached = null;
      }
    }
  }
  return cached;
}

export async function saveSession(session: StoredSession): Promise<void> {
  cached = session;
  loaded = true;
  await writeRaw(JSON.stringify(session));
  notify(session);
}

export async function clearSession(): Promise<void> {
  cached = null;
  loaded = true;
  await writeRaw(null);
  notify(null);
}

async function refreshSession(refreshToken: string): Promise<StoredSession | null> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      session: { access_token: string; refresh_token: string; expires_at?: number };
      user: { id: string };
    };

    const next: StoredSession = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      userId: data.user.id,
    };

    await saveSession(next);
    return next;
  } catch {
    return null;
  }
}

/**
 * Returns a usable access token, refreshing it when it is about to expire.
 * Returns null when there is no session or it can no longer be refreshed.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt - 60 > now) return session.accessToken;

  const refreshed = await refreshSession(session.refreshToken);
  if (!refreshed) {
    await clearSession();
    return null;
  }

  return refreshed.accessToken;
}

/** Loads the session and refreshes it if it is already expired. */
export async function restoreSession(): Promise<StoredSession | null> {
  const session = await getSession();
  if (!session) return null;
  const token = await getValidAccessToken();
  return token ? await getSession() : null;
}

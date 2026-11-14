import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys factory for consistency
export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
    profile: ['auth', 'profile'] as const,
  },
  colleges: {
    all: ['colleges'] as const,
    search: (query: string) => ['colleges', 'search', query] as const,
  },
  posts: {
    all: ['posts'] as const,
    feed: (filters?: Record<string, unknown>) => ['posts', 'feed', filters] as const,
    detail: (id: string) => ['posts', 'detail', id] as const,
    comments: (postId: string) => ['posts', postId, 'comments'] as const,
  },
  discover: {
    profiles: (filters?: Record<string, unknown>) => ['discover', 'profiles', filters] as const,
    profile: (id: string) => ['discover', 'profile', id] as const,
  },
  vibes: {
    sent: ['vibes', 'sent'] as const,
    count: ['vibes', 'count'] as const,
  },
  matches: {
    all: ['matches'] as const,
    detail: (id: string) => ['matches', 'detail', id] as const,
    messages: (matchId: string) => ['matches', matchId, 'messages'] as const,
  },
} as const;

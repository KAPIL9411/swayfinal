/**
 * API Client for SWAY Backend
 * Communicates with Cloudflare Workers API
 */

import { API_URL } from './config';
import { clearSession, getValidAccessToken } from './session';

export { API_URL };

interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { requireAuth = true, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (requireAuth) {
    const token = await getValidAccessToken();
    if (!token) {
      throw new ApiError('Please sign in again', 401, 'unauthorized');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });
  } catch {
    throw new ApiError('Network error. Check your connection', 0, 'network_error');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}) as Record<string, string>);

    // A rejected token means the session is no longer usable
    if (response.status === 401 && requireAuth) {
      await clearSession();
    }

    throw new ApiError(
      error.error || error.message || `Request failed (${response.status})`,
      response.status,
      error.code
    );
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data === undefined ? undefined : JSON.stringify(data),
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data === undefined ? undefined : JSON.stringify(data),
    }),

  delete: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

// ---- Types ----------------------------------------------------------------

export interface College {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

export type LookingFor = 'friends' | 'dating' | 'both';
export type PostCategory = 'confession' | 'question' | 'opinion' | 'event' | 'meme' | 'lost_found';
export type ReactionKind = 'fire' | 'heart' | 'laugh' | 'wow' | 'sad';

export interface Profile {
  id: string;
  college_id: string;
  username: string;
  avatar_key: string;
  bio: string | null;
  year_of_study: number | null;
  branch: string | null;
  interests: string[];
  looking_for: LookingFor;
  is_discoverable: boolean;
  is_admin?: boolean;
  status: string;
  created_at: string;
}

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface MyVerification {
  status: VerificationStatus;
  note: string | null;
  requestId: string | null;
  reviewedAt: string | null;
  emailDomainVerified: boolean;
  emailCollege: { id: string; name: string } | null;
}

export interface AdminVerificationRequest {
  id: string;
  status: VerificationStatus;
  note: string | null;
  createdAt: string;
  collegeName: string | null;
  email: string | null;
  imageUrl: string | null;
}

export interface DiscoverProfile {
  id: string;
  username: string;
  avatarKey: string;
  bio: string | null;
  yearOfStudy: number | null;
  branch: string | null;
  interests: string[];
  lookingFor: LookingFor;
  sharedInterests: string[];
  vibeSent: boolean;
  joinedAt: string;
}

export interface Post {
  id: string;
  category: PostCategory;
  body: string;
  image_path: string | null;
  reaction_count: number;
  comment_count: number;
  created_at: string;
  is_mine: boolean;
  my_reaction: ReactionKind | null;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  alias: string;
  is_op: boolean;
  is_mine: boolean;
}

export interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface MatchSummary {
  id: string;
  createdAt: string;
  profile: {
    id: string;
    username: string;
    avatarKey: string;
    bio: string | null;
    yearOfStudy: number | null;
    branch: string | null;
    interests: string[];
    lookingFor: LookingFor;
  } | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

export interface SessionUser {
  id: string;
  email: string;
}

// ---- Endpoints ------------------------------------------------------------

export const authApi = {
  /** Supabase anonymous session: no email, no OTP. */
  anonymous: () =>
    api.post<{
      isAnonymous: boolean;
      session: { access_token: string; refresh_token: string; expires_at: number | null };
      user: { id: string };
    }>('/auth/anonymous', undefined, { requireAuth: false }),

  verifyEmail: (email: string) =>
    api.post<{
      verified: boolean;
      college: College | null;
      nextStep?: string;
      message?: string;
    }>(
      '/auth/verify-email',
      { email },
      { requireAuth: false }
    ),

  sendOtp: (email: string) =>
    api.post<{ success: boolean }>('/auth/send-otp', { email }, { requireAuth: false }),

  verifyOtp: (email: string, token: string) =>
    api.post<{ session: SessionTokens; user: SessionUser }>(
      '/auth/verify-otp',
      { email, token },
      { requireAuth: false }
    ),

  signOut: () => api.post<{ success: boolean }>('/auth/signout'),

  checkUsername: (username: string) =>
    api.get<{ available: boolean }>(`/auth/username/${encodeURIComponent(username)}`, {
      requireAuth: false,
    }),

  me: () => api.get<{ profile: Profile | null }>('/auth/me'),

  createProfile: (data: {
    collegeId: string;
    username: string;
    avatarKey: string;
    interests: string[];
    lookingFor: LookingFor;
    is18Confirmed: true;
    guidelinesAccepted: true;
  }) => api.post<{ profile: Profile }>('/auth/profile', data),

  updateProfile: (data: {
    bio?: string | null;
    yearOfStudy?: number | null;
    branch?: string | null;
    interests?: string[];
    lookingFor?: LookingFor;
    isDiscoverable?: boolean;
    avatarKey?: string;
  }) => api.patch<{ profile: Profile }>('/auth/profile', data),
};

export const collegesApi = {
  /** Server-side search over the full directory. Empty query = popular campuses. */
  search: (query?: string) =>
    api.get<{ colleges: College[]; query?: string }>(
      `/colleges${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      { requireAuth: false }
    ),

  getById: (id: string) =>
    api.get<{ college: College }>(`/colleges/${id}`, { requireAuth: false }),
};

export const verificationApi = {
  me: () => api.get<MyVerification>('/verification/me'),

  submit: (data: { collegeId: string; image: string; mimeType: string }) =>
    api.post<{ request: { id: string; status: VerificationStatus; created_at: string } }>(
      '/verification',
      data
    ),

  adminList: () =>
    api.get<{ requests: AdminVerificationRequest[]; unavailable?: boolean }>(
      '/verification/admin/list?status=pending'
    ),

  review: (id: string, action: 'approve' | 'reject', note?: string) =>
    api.post<{ success: boolean; status: VerificationStatus }>(`/verification/admin/${id}`, {
      action,
      note,
    }),
};

export const postsApi = {
  getFeed: () => api.get<{ posts: Post[] }>('/posts'),

  getPost: (id: string) => api.get<{ post: Post }>(`/posts/${id}`),

  createPost: (data: { category: PostCategory; body: string; image?: string }) =>
    api.post<{ postId: string }>('/posts', data),

  react: (postId: string, kind: ReactionKind) =>
    api.post<{ success: boolean; reactionCount: number; myReaction: ReactionKind }>(
      `/posts/${postId}/react`,
      { kind }
    ),

  unreact: (postId: string) =>
    api.delete<{ success: boolean; reactionCount: number }>(`/posts/${postId}/react`),
};

export const commentsApi = {
  getComments: (postId: string) => api.get<{ comments: Comment[] }>(`/comments/${postId}`),

  createComment: (data: { postId: string; body: string; parentId?: string }) =>
    api.post<{ commentId: string }>('/comments', data),
};

export const vibesApi = {
  getCount: () => api.get<{ count: number }>('/vibes/count'),

  getSent: () => api.get<{ vibes: { receiver_id: string; status: string; created_at: string }[] }>(
    '/vibes/sent'
  ),

  send: (targetId: string) =>
    api.post<{ matched: boolean; matchId?: string }>('/vibes/send', { targetId }),

  withdraw: (targetId: string) => api.post<{ success: boolean }>('/vibes/withdraw', { targetId }),
};

export const discoverApi = {
  getProfiles: (filters?: { interests?: string[]; year?: number; lookingFor?: LookingFor }) => {
    const params = new URLSearchParams();
    if (filters?.interests?.length) params.set('interests', filters.interests.join(','));
    if (filters?.year) params.set('year', String(filters.year));
    if (filters?.lookingFor) params.set('lookingFor', filters.lookingFor);
    const query = params.toString();
    return api.get<{ profiles: DiscoverProfile[] }>(`/discover${query ? `?${query}` : ''}`);
  },
};

export const matchesApi = {
  getMatches: () => api.get<{ matches: MatchSummary[] }>('/matches'),

  getMessages: (matchId: string) =>
    api.get<{ messages: ChatMessage[] }>(`/matches/${matchId}/messages`),

  sendMessage: (matchId: string, body: string) =>
    api.post<{ message: ChatMessage }>(`/matches/${matchId}/messages`, { body }),

  markRead: (matchId: string) => api.post<{ success: boolean }>(`/matches/${matchId}/read`),

  unmatch: (matchId: string) => api.post<{ success: boolean }>(`/matches/${matchId}/unmatch`),
};

export const reportsApi = {
  report: (data: {
    targetType: 'post' | 'comment' | 'profile' | 'message';
    targetId: string;
    reason: string;
    details?: string;
  }) => api.post<{ success: boolean }>('/reports', data),
};

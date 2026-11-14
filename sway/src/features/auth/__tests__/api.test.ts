/**
 * API client tests
 * Live connectivity is checked outside jest; these tests pin the client's
 * behaviour (auth header, error mapping, JSON handling).
 */

import { apiRequest, ApiError } from '../../../lib/api';

const mockGetToken = jest.fn(async (): Promise<string | null> => 'test-token');
const mockClearSession = jest.fn(async () => undefined);

jest.mock('../../../lib/session', () => ({
  getValidAccessToken: () => mockGetToken(),
  clearSession: () => mockClearSession(),
}));

describe('apiRequest', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends the bearer token for authenticated requests', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await apiRequest('/posts');

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  it('omits the token when requireAuth is false', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await apiRequest('/colleges', { requireAuth: false });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('refuses to call an authenticated endpoint without a session', async () => {
    mockGetToken.mockResolvedValueOnce(null);
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiRequest('/posts')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears the session when the API rejects the token', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid token' }),
    })) as unknown as typeof fetch;

    await expect(apiRequest('/posts')).rejects.toMatchObject({ status: 401 });
    expect(mockClearSession).toHaveBeenCalled();
  });

  it('maps an API error body to an ApiError', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Daily vibe limit reached', code: 'daily_limit' }),
    })) as unknown as typeof fetch;

    await expect(apiRequest('/vibes/send', { method: 'POST' })).rejects.toMatchObject({
      message: 'Daily vibe limit reached',
      status: 429,
      code: 'daily_limit',
    });
  });

  it('reports network failures as ApiError', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;

    await expect(apiRequest('/posts')).rejects.toBeInstanceOf(ApiError);
  });
});

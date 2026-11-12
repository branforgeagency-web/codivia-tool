import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './tokenCookies';
import { REFRESH_TOKENS } from './endpoints';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

// Fired when the session can't be renewed, so the app can show the sign-in screen.
export const SESSION_EXPIRED_EVENT = 'cv-session-expired';

// One refresh at a time: concurrent 401s all wait for the same new token pair.
// Each refresh token works once (rotation; reuse revokes the session), so tabs also take
// a shared lock, and skip the refresh if another tab already renewed the tokens.
const withRefreshLock = (fn) =>
  navigator.locks ? navigator.locks.request('cv-refresh-tokens', fn) : fn();

let refreshing = null;
export function refreshSession() {
  if (!refreshing) {
    const accessBefore = getAccessToken();
    refreshing = withRefreshLock(async () => {
      const accessNow = getAccessToken();
      if (accessNow && accessNow !== accessBefore) return true; // renewed by another tab
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;
      try {
        const { tokens } = await request('POST', REFRESH_TOKENS, { refreshToken }, { auth: false, retry: false });
        saveTokens(tokens);
        return true;
      } catch {
        clearTokens();
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        return false;
      }
    }).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(method, endpoint, data, options = {}) {
  // Accept relative API routes only, so the access token stays on this API origin.
  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('/') ||
    endpoint.startsWith('//') ||
    /[\\?#]/.test(endpoint)
  ) {
    throw new Error('Pass a relative API endpoint; use options.params for query parameters');
  }
  const { params, auth = true, retry = true, headers: extraHeaders, ...fetchOptions } = options;
  // Access token cookie already expired: renew before sending rather than after a 401.
  if (auth && retry && !getAccessToken() && getRefreshToken()) await refreshSession();
  const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
  }
  const headers = new Headers(extraHeaders);
  const token = auth ? getAccessToken() : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
  if (data !== undefined && !isForm) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, {
    ...fetchOptions,
    redirect: 'error',
    method,
    headers,
    body: data === undefined ? undefined : isForm ? data : JSON.stringify(data),
  });
  if (response.status === 401 && auth && retry && getRefreshToken() && (await refreshSession())) {
    return request(method, endpoint, data, { ...options, retry: false });
  }
  const text = await response.text();
  let result = text || null;
  if (text && response.headers.get('content-type')?.includes('json')) {
    try {
      result = JSON.parse(text);
    } catch {
      /* Keep non-JSON error text available. */
    }
  }
  if (!response.ok)
    throw new ApiError(
      result?.message || `Request failed (${response.status})`,
      response.status,
      result,
    );
  return result;
}

export const get = (endpoint, options) => request('GET', endpoint, undefined, options);
export const getById = (endpoint, id, options) => {
  if (id === undefined || id === null || id === '') throw new Error('An ID is required');
  return get(`${endpoint.replace(/\/$/, '')}/${encodeURIComponent(id)}`, options);
};
export const post = (endpoint, data, options) => request('POST', endpoint, data, options);
export const patch = (endpoint, data, options) => request('PATCH', endpoint, data, options);
export const put = (endpoint, data, options) => request('PUT', endpoint, data, options);
export const del = (endpoint, options) => request('DELETE', endpoint, undefined, options);
export { del as delete };

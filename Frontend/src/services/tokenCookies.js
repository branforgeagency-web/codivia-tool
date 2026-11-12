const ACCESS_COOKIE = 'codivia_access_token';
const REFRESH_KEY = 'codivia_refresh_token';

export function getAccessToken() {
  const cookie = document.cookie.split('; ').find(value => value.startsWith(`${ACCESS_COOKIE}=`));
  return cookie ? decodeURIComponent(cookie.slice(ACCESS_COOKIE.length + 1)) : null;
}

export function setAccessToken(token, expiresAt) {
  const expiry = new Date(expiresAt);
  if (typeof token !== 'string' || !token || !Number.isFinite(expiry.getTime()) || expiry <= new Date()) {
    throw new Error('A valid access token and future expiry are required');
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; Expires=${expiry.toUTCString()}; SameSite=Lax${secure}`;
}

export function clearAccessToken() {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

// The refresh token keeps the user signed in after the 15-minute access token expires.
// It is never sent as a cookie; only POST /auth/refresh-tokens and /auth/logout receive it.
// TODO: move it to an HttpOnly cookie set by the backend so page scripts cannot read it.
export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token) {
  try {
    localStorage.setItem(REFRESH_KEY, token);
  } catch {
    /* storage unavailable (private mode): the session lasts until the access token expires */
  }
}

export function clearRefreshToken() {
  try {
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

// Store both tokens from a login / register / refresh response.
export function saveTokens(tokens) {
  setAccessToken(tokens.access.token, tokens.access.expiresAt);
  if (tokens.refresh?.token) setRefreshToken(tokens.refresh.token);
}

export function clearTokens() {
  clearAccessToken();
  clearRefreshToken();
}

const ACCESS_COOKIE = 'codivia_access_token';

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

// JavaScript cookies cannot be HttpOnly. Never store refresh tokens here.

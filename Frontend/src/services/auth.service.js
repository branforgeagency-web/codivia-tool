import { post } from './apiHelper';
import { LOGIN } from './endpoints';
import { setAccessToken } from './tokenCookies';

// Call this from a login form when backend authentication is needed.
export async function login(email, password) {
  const result = await post(LOGIN, { email, password }, { auth: false });
  setAccessToken(result.tokens.access.token, result.tokens.access.expiresAt);
  return result;
}

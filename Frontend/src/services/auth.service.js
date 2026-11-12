/* Backend authentication: sign in, sign up, current user, sign out. */
import { get, post } from './apiHelper';
import { LOGIN, LOGOUT, ME, REGISTER } from './endpoints';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './tokenCookies';

// Returns { user, tokens }; the tokens are stored, so later API calls are signed in.
export async function login(email, password) {
  const result = await post(LOGIN, { email, password }, { auth: false });
  saveTokens(result.tokens);
  return result;
}

// Sign-up only creates the student account ({ user }); they sign in afterwards.
// result.user.studentId is their Student ID.
export function register(name, email, password) {
  return post(REGISTER, { name, email, password }, { auth: false });
}

// The signed-in user, or null when there is no session (or it can't be renewed).
export async function getCurrentUser() {
  if (!getAccessToken() && !getRefreshToken()) return null;
  try {
    return await get(ME);
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      clearTokens();
      return null;
    }
    throw err;
  }
}

// Revokes the refresh token on the server, then forgets both tokens locally.
export async function logout() {
  const refreshToken = getRefreshToken();
  clearTokens();
  if (!refreshToken) return;
  try {
    await post(LOGOUT, { refreshToken }, { auth: false });
  } catch {
    /* already expired or revoked: nothing left to end */
  }
}

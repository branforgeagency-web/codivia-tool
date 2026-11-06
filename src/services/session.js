import { activeDeptKeys } from '../utils/allocation.js';

// Guest access (2 Nov): open the workspace straight away, no login. 5 charts in every live department.
// Guest progress is kept in this browser only. Real accounts (login) still save to Firebase.
export function cvxGuestSession() {
  const depts = {};
  try {
    activeDeptKeys().forEach((k) => {
      depts[k] = 5;
    });
  } catch (x) {}
  let res = {};
  try {
    res = JSON.parse(localStorage.getItem('cvx-guest-results') || '{}') || {};
  } catch (x) {}
  return {
    role: 'student',
    user: {
      uid: null,
      guest: true,
      id: 'GUEST',
      name: 'Guest coder',
      email: '',
      depts,
      initialResults: res,
    },
  };
}

export function cvxWantsLogin() {
  if (window.location.pathname === '/sign-in') return true;
  if (window.CVX_WANT_LOGIN) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('login') === '1' || params.get('signup') === '1';
  } catch (x) {
    return false;
  }
}

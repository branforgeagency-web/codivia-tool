/* CODIVIA platform — session: signed-in user + role (from the backend API), code database.
   Everything below <SessionProvider> can read it with useSession(). */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loadCodeDB } from '../services/codeDb.js';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../routes/paths.js';
import { get, SESSION_EXPIRED_EVENT } from '../services/apiHelper.js';
import { CHART_RESULTS, DEPARTMENTS, MY_CHARTS } from '../services/endpoints.js';
import * as authApi from '../services/auth.service.js';

const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}

// Department records from the database: { KEY: { key, name, icon, group, elements, chartCount } }.
export function useDepartments() {
  const ctx = useContext(SessionContext);
  return (ctx && ctx.session && ctx.session.departments) || {};
}

// One department, or a placeholder while it isn't known.
export const deptInfo = (departments, key) => departments[key] || { key, name: key, icon: '', group: '', elements: [] };

// GET /departments (active ones for students). Not paged: a few dozen rows, used for labels everywhere.
async function loadDepartments() {
  try {
    const { results } = await get(DEPARTMENTS);
    return Object.fromEntries((results || []).map((d) => [d.id, { ...d, key: d.id }]));
  } catch (e) {
    console.error('load departments', e);
    return {};
  }
}

// A student's saved scores; an empty map if they can't be loaded, so sign-in still works.
async function loadResults() {
  try {
    const { results } = await get(CHART_RESULTS);
    return results || {};
  } catch (e) {
    console.error('load chart results', e);
    return {};
  }
}

// A student's allocated departments from GET /my-charts (one page of 100 covers every department):
// depts = { DEPT: { start, end } } for route checks, and the cards (name, pool, assigned…) for the dashboard.
async function loadAllocations() {
  try {
    const { results } = await get(MY_CHARTS, { params: { limit: 100 } });
    const cards = results || [];
    return { depts: Object.fromEntries(cards.map((d) => [d.key, d.range])), cards };
  } catch (e) {
    console.error('load allocations', e);
    return { depts: {}, cards: [] };
  }
}

// Turn the API user into the session object the app reads: { role, user }.
async function toSession(apiUser) {
  const base = { uid: apiUser.id, name: apiUser.name || apiUser.email, email: apiUser.email };
  if (apiUser.role !== 'student') return { role: apiUser.role, user: base, departments: await loadDepartments() };
  const [departments, { depts, cards }, initialResults] = await Promise.all([loadDepartments(), loadAllocations(), loadResults()]);
  return {
    role: 'student',
    departments,
    user: { ...base, id: apiUser.studentId || 'STU-?????', depts, deptCards: cards, initialResults },
  };
}

export function SessionProvider({ children }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(null); // {role, user}
  const [codeDB, setCodeDB] = useState(null);
  const [dbStatus, setDbStatus] = useState('idle');
  const [authChecked, setAuthChecked] = useState(false);

  // Called by the sign-in screen after a successful login / sign-up.
  const startSession = useCallback(async (apiUser) => {
    setSession(await toSession(apiUser));
  }, []);

  // Restore the session from stored tokens on first load.
  useEffect(() => {
    let cancelled = false;
    authApi
      .getCurrentUser()
      .then((apiUser) => (apiUser ? toSession(apiUser) : null))
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch((e) => {
        console.error('restore session', e);
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The refresh token was rejected (expired, revoked, account disabled): sign out.
  useEffect(() => {
    const onExpired = () => setSession(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // load code DB once logged in as student
  useEffect(() => {
    if (session && session.role === 'student' && !codeDB && dbStatus === 'idle') {
      setDbStatus('loading');
      loadCodeDB()
        .then((db) => {
          setCodeDB(db);
          setDbStatus('ready');
        })
        .catch((err) => {
          console.error(err);
          setDbStatus('error');
        });
    }
  }, [session, codeDB, dbStatus]);

  const logout = () => {
    navigate(PATHS.signIn);
    setSession(null);
    authApi.logout();
  };

  const value = {
    ready: authChecked,
    session,
    setSession,
    startSession,
    logout,
    codeDB,
    dbStatus,
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

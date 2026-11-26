import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loadCodeDB } from '../services/codeDb.js';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../routes/paths.js';
import { get, SESSION_EXPIRED_EVENT } from '../services/apiHelper.js';
import { CHART_RESULTS, DEPARTMENTS, MY_CHARTS } from '../services/endpoints.js';
import * as authApi from '../services/auth.service.js';
import { clearLocalDrafts } from '../offline/draftStore.js';

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

// Each loader returns its data, or an empty value plus the name of what failed, so sign-in still
// works and the layout can show "Some data couldn't load — Retry" instead of silently empty pages.

// GET /departments (active ones for students). Not paged: a few dozen rows, used for labels everywhere.
async function loadDepartments(issues) {
  try {
    const { results } = await get(DEPARTMENTS);
    return Object.fromEntries((results || []).map((d) => [d.id, { ...d, key: d.id }]));
  } catch (e) {
    console.error('load departments', e);
    issues.push('departments');
    return {};
  }
}

// A student's saved scores; an empty map if they can't be loaded, so sign-in still works.
async function loadResults(issues) {
  try {
    const { results } = await get(CHART_RESULTS);
    return results || {};
  } catch (e) {
    console.error('load chart results', e);
    issues.push('your scores');
    return {};
  }
}

// A student's allocated departments from GET /my-charts (one page of 100 covers every department):
// depts = { DEPT: { start, end } } for route checks, and the cards (name, pool, assigned…) for the dashboard.
async function loadAllocations(issues) {
  try {
    const { results } = await get(MY_CHARTS, { params: { limit: 100 } });
    const cards = results || [];
    return { depts: Object.fromEntries(cards.map((d) => [d.key, d.range])), cards };
  } catch (e) {
    console.error('load allocations', e);
    issues.push('your allocated departments');
    return { depts: {}, cards: [] };
  }
}

// Turn the API user into the session object the app reads: { role, user }.
// `loadIssues` lists what could not be loaded (empty when everything loaded).
async function toSession(apiUser) {
  const issues = [];
  const base = { uid: apiUser.id, name: apiUser.name || apiUser.email, email: apiUser.email };
  if (apiUser.role !== 'student') return { role: apiUser.role, user: base, departments: await loadDepartments(issues), loadIssues: issues };
  const [departments, { depts, cards }, initialResults] = await Promise.all([loadDepartments(issues), loadAllocations(issues), loadResults(issues)]);
  return {
    role: 'student',
    departments,
    loadIssues: issues,
    // Real accounts always have a server-issued studentId (STU-00001…). Fallback for an account
    // without one: STU- + the last 5 characters of its database id.
    user: { ...base, id: apiUser.studentId || 'STU-' + String(apiUser.id || '').slice(-5).toUpperCase(), depts, deptCards: cards, initialResults },
  };
}

export function SessionProvider({ children }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(null); // {role, user}
  const [codeDB, setCodeDB] = useState(null);
  const [dbStatus, setDbStatus] = useState('idle');
  const [authChecked, setAuthChecked] = useState(false);
  // Set when the session could not be restored because the server was unreachable (not because
  // the user is signed out): the app shows "Can't reach CODIVIA — Retry" instead of the sign-in page.
  const [bootError, setBootError] = useState('');
  const [bootAttempt, setBootAttempt] = useState(0);
  const retryBoot = useCallback(() => {
    setBootError('');
    setAuthChecked(false);
    setBootAttempt((n) => n + 1);
  }, []);

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
        if (cancelled) return;
        setSession(null);
        // Tokens are kept (getCurrentUser only clears them on 401/403), so Retry can sign back in.
        setBootError(e && e.message ? e.message : 'The server did not respond.');
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [bootAttempt]);

  // Re-load the signed-in user's data (the "Retry" on the "some data couldn't load" banner).
  const reloadSession = useCallback(async () => {
    const apiUser = await authApi.getCurrentUser();
    setSession(apiUser ? await toSession(apiUser) : null);
  }, []);

  // The refresh token was rejected (expired, revoked, account disabled): sign out.
  useEffect(() => {
    const onExpired = () => setSession(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // load code DB once logged in as a student or auditor (both use Code Search)
  useEffect(() => {
    if (session && (session.role === 'student' || session.role === 'auditor') && !codeDB && dbStatus === 'idle') {
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
  const retryCodeDB = useCallback(() => setDbStatus('idle'), []);

  const logout = () => {
    // Shared lab PCs: signing out removes this user's unsynced workspace drafts from the device.
    if (session && session.user && session.user.uid) clearLocalDrafts(session.user.uid);
    navigate(PATHS.signIn);
    setSession(null);
    authApi.logout();
  };

  const value = {
    ready: authChecked,
    bootError,
    retryBoot,
    reloadSession,
    session,
    setSession,
    startSession,
    logout,
    codeDB,
    dbStatus,
    retryCodeDB,
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

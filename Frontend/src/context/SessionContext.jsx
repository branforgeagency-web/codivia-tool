/* CODIVIA platform — session: Firebase readiness, signed-in user + role, code database.
   Everything below <SessionProvider> can read it with useSession(). */
import { createContext, useContext, useEffect, useState } from 'react';
import { loadCodeDB } from '../services/codeDb.js';
import { cvxGuestSession, cvxWantsLogin } from '../services/session.js';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../routes/paths.js';

const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(null); // {role, user}
  const [codeDB, setCodeDB] = useState(null);
  const [dbStatus, setDbStatus] = useState('idle');
  const [authChecked, setAuthChecked] = useState(false);
  const [fbReady, setFbReady] = useState(!!(window.CV_FB && window.CV_FB.ready));

  // wait for the Firebase module script to finish loading
  useEffect(() => {
    if (fbReady) return;
    const on = () => setFbReady(true);
    window.addEventListener('cv-fb-ready', on);
    const t = setInterval(() => {
      if (window.CV_FB && window.CV_FB.ready) {
        setFbReady(true);
      }
    }, 150);
    return () => {
      window.removeEventListener('cv-fb-ready', on);
      clearInterval(t);
    };
  }, [fbReady]);

  // Merge PUBLISHED uploaded charts into window.CHART_DATA before the app reads
  // it. Everything downstream (queue, coder, scoring, deptHasCharts) then works
  // unchanged — uploaded charts are indistinguishable from built-in ones.
  const [uploadsMerged, setUploadsMerged] = useState(false);
  useEffect(() => {
    if (!fbReady || uploadsMerged) return;
    let cancelled = false;
    window.CV_FB.listUploadedCharts()
      .then((list) => {
        if (cancelled) return;
        (list || []).forEach((u) => {
          if (u.status !== 'published') return; // drafts never reach students
          if (!u.dept || !Array.isArray(u.answerKey) || !u.answerKey.length) return;
          if (!window.CHART_DATA[u.dept]) window.CHART_DATA[u.dept] = [];
          const arr = window.CHART_DATA[u.dept];
          if (arr.some((c) => c.id === u.id)) return; // idempotent
          arr.push({
            id: u.id,
            dept: u.dept,
            deptName: u.deptName || u.dept,
            title: u.title || 'Uploaded chart',
            difficulty: u.difficulty || 'moderate',
            patient: u.patient || { name: 'Uploaded Record', sex: 'F', age: 45 },
            record: u.record || '',
            answerKey: u.answerKey,
            uploaded: true,
          });
        });
        setUploadsMerged(true);
      })
      .catch((e) => {
        console.error('listUploadedCharts', e);
        setUploadsMerged(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fbReady, uploadsMerged]);

  // subscribe to auth state once Firebase is ready
  useEffect(() => {
    if (!fbReady) return;
    const unsub = window.CV_FB.onAuth(async (fbUser) => {
      if (!fbUser) {
        setSession(cvxWantsLogin() ? null : cvxGuestSession());
        setAuthChecked(true);
        return;
      }
      const uid = fbUser.uid;
      const role = await window.CV_FB.getRole(uid);
      if (role === 'admin') {
        setSession({ role: 'admin', user: { name: 'Admin / TL', uid } });
        setAuthChecked(true);
        return;
      }
      // student: load profile + allocation + progress
      const [stu, alloc, progress] = await Promise.all([
        window.CV_FB.getStudent(uid),
        window.CV_FB.getAllocation(uid),
        window.CV_FB.loadProgress(uid),
      ]);
      const user = {
        uid,
        id: (stu && stu.studentId) || 'STU-?????',
        name: (stu && stu.name) || fbUser.email || 'Student',
        email: fbUser.email,
        depts: alloc || {},
        initialResults: progress || {},
      };
      setSession({ role: 'student', user });
      setAuthChecked(true);
    });
    return () => unsub && unsub();
  }, [fbReady]);

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
    window.CVX_WANT_LOGIN = true;
    navigate(PATHS.signIn);
    if (session && session.role === 'student') {
      window.CVX_WANT_LOGIN = true;
      if (session.user && session.user.guest) {
        setSession(null);
        return;
      }
    }
    window.CV_FB.logout();
  };

  const value = {
    ready: fbReady && authChecked,
    session,
    setSession,
    logout,
    codeDB,
    dbStatus,
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/* CODIVIA platform — student workspace state: results, saving, per-department stats, score.
   Shared by every student page through useStudent(). */
import { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CERT_THRESHOLD } from '../config/constants.js';
import { deptHasCharts } from '../utils/allocation.js';
import { useSession } from './SessionContext.jsx';

const StudentContext = createContext(null);

export function useStudent() {
  return useContext(StudentContext);
}

// Renders the child routes with the student state available.
export function StudentProvider() {
  const { session, codeDB, dbStatus } = useSession();
  const stu = session.user;
  const [results, setResults] = useState(stu.initialResults || {}); // chartId -> {accuracy, dept, ...}
  const [demoCert, setDemoCert] = useState(false); // preview: simulate a certified department

  // Saving is idempotent: re-submitting the same chart overwrites its entry.
  const [saveState, setSaveState] = useState(''); // '' | 'saving' | 'saved' | 'error'
  const resultsRef = useRef(null);
  if (resultsRef.current === null) resultsRef.current = stu.initialResults || {};

  const recordResult = (chartId, res, dk) => {
    // Only the fields needed for progress/scoring are persisted. The full
    // correct/missed/wrong arrays carry every rationale string and would push
    // the progress document past the Firestore 1 MiB limit once a student
    // approaches the 200-chart certificate threshold in more than one dept.
    const slim = {
      accuracy: typeof res.accuracy === 'number' ? res.accuracy : 0,
      total: typeof res.total === 'number' ? res.total : 0,
      correct: Array.isArray(res.correct) ? res.correct.length : 0,
      dept: dk,
      at: Date.now(),
    };
    if (res.drgOk === true || res.drgOk === false) slim.drgOk = res.drgOk;
    // Store CODES ONLY for missed / wrong answers so admin can see where a
    // student is going wrong. Rationale text is deliberately excluded — it is
    // what would blow the Firestore 1 MiB document limit at scale.
    // missed[] entries carry .raw (dotted code) and .code (normalised).
    // wrong[]  entries carry .code (what the student submitted) and, when the
    // grader could pair it, .correctedTo.code (the audited code).
    if (Array.isArray(res.missed) && res.missed.length) {
      slim.miss = res.missed
        .map((k) => String((k && (k.raw || k.code)) || ''))
        .filter(Boolean)
        .slice(0, 12);
    }
    if (Array.isArray(res.wrong) && res.wrong.length) {
      slim.wrong = res.wrong
        .map((w) => [
          String((w && w.code) || ''),
          String((w && w.correctedTo && w.correctedTo.code) || ''),
        ])
        .filter((x) => x[0])
        .slice(0, 12);
    }

    const next = { ...resultsRef.current, [chartId]: slim };
    resultsRef.current = next;
    setResults(next);

    if (stu.uid && window.CV_FB) {
      setSaveState('saving');
      window.CV_FB.saveProgress(stu.uid, next)
        .then(() => setSaveState('saved'))
        .catch((e) => {
          console.error('save progress', e);
          setSaveState('error');
        });
    }
  };

  // aggregate stats per department
  const stats = useMemo(() => {
    const perDept = {};
    const allocEntries = Object.entries(stu.depts).filter(([dk]) => deptHasCharts(dk));
    const firstDept = allocEntries.length ? allocEntries[0][0] : undefined;
    allocEntries.forEach(([dk, alloc]) => {
      const worked = Object.entries(results).filter(([id, r]) => r.dept === dk);
      const accs = worked.map(([, r]) => r.accuracy);
      let workedCount = worked.length;
      let avg = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : 0;
      // Preview mode: simulate the first department as fully certified so the
      // certificate can be seen generating without working 200 real charts.
      if (demoCert && dk === firstDept) {
        workedCount = Math.max(workedCount, CERT_THRESHOLD + 10);
        avg = avg || 94;
      }
      perDept[dk] = {
        alloc,
        worked: workedCount,
        avg,
        certified: workedCount >= CERT_THRESHOLD,
      };
    });
    const totalWorked = Object.keys(results).length;
    const allAccs = Object.values(results).map((r) => r.accuracy);
    const overallAvg = allAccs.length
      ? Math.round(allAccs.reduce((a, b) => a + b, 0) / allAccs.length)
      : 0;
    const anyCertified = Object.values(perDept).some((d) => d.certified);
    return { perDept, totalWorked, overallAvg, anyCertified };
  }, [results, stu.depts, demoCert]);

  // CODIVIA Score is earned, not granted. A student who has coded nothing has no
  // score yet — showing a floor of 550 made an untouched account look accomplished.
  const hasScore = stats.totalWorked > 0;
  const codScore = hasScore
    ? Math.min(850, 300 + stats.totalWorked * 2 + Math.round(stats.overallAvg * 2))
    : null;

  const value = {
    session,
    stu,
    codeDB,
    dbStatus,
    results,
    recordResult,
    saveState,
    stats,
    demoCert,
    setDemoCert,
    hasScore,
    codScore,
  };
  return (
    <StudentContext.Provider value={value}>
      <Outlet />
    </StudentContext.Provider>
  );
}

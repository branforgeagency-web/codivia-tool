/* CODIVIA platform — student workspace state: results, saving, per-department stats, score.
   Shared by every student page through useStudent(). */
import { createContext, useContext, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CERT_THRESHOLD } from '../config/constants.js';
import { put } from '../services/apiHelper.js';
import { CHART_RESULT } from '../services/endpoints.js';
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

  // Submitting is idempotent: re-submitting the same chart overwrites its entry.
  const [saveState, setSaveState] = useState(''); // '' | 'saving' | 'saved' | 'error'

  // The server scores the chart against its answer key and saves the result:
  // PUT /chart-results/:chartId { rows: [{code, desc, mod, poa}], drg } -> { result, saved, certificate }.
  // Returns the full result for the result screen.
  const submitChart = async (chartId, rows, drg) => {
    setSaveState('saving');
    try {
      const body = {
        rows: rows
          .filter((r) => r && (r.code || r.mod))
          .slice(0, 200)
          .map((r) => ({ code: String(r.code || '').slice(0, 30), desc: String(r.desc || '').slice(0, 500), mod: String(r.mod || '').slice(0, 10), poa: String(r.poa || '').slice(0, 5) })),
        drg: drg || '',
      };
      const { result, saved } = await put(CHART_RESULT(chartId), body);
      setResults((cur) => ({ ...cur, [chartId]: saved }));
      setSaveState('saved');
      return result;
    } catch (e) {
      console.error('submit chart', e);
      setSaveState('error');
      throw e;
    }
  };

  // aggregate stats per department
  const stats = useMemo(() => {
    const perDept = {};
    const allocEntries = Object.entries(stu.depts); // only departments with charts (GET /my-charts)
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
    submitChart,
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

/* CODIVIA platform — full-screen coding page for one chart (header + coder, no sidebar) */
import { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../../components/layout/Header.jsx';
import { DEPTS } from '../../../config/constants.js';
import { useSession } from '../../../context/SessionContext.jsx';
import { useStudent } from '../../../context/StudentContext.jsx';
import { deptQueuePath } from '../../../routes/paths.js';
import { allocSlice, deptHasCharts } from '../../../utils/allocation.js';
import { Coder } from './Coder.jsx';

// route: /charts/:dept/:chartId — only charts inside the student's allocated range
export default function CoderPage() {
  const { dept, chartId } = useParams();
  const { logout } = useSession();
  const { session, stu, codeDB, dbStatus, saveState, recordResult } = useStudent();
  const navigate = useNavigate();

  const chart = useMemo(() => {
    if (!(DEPTS[dept] && stu.depts && stu.depts[dept] != null && deptHasCharts(dept))) return null;
    const pool = (window.CHART_DATA && window.CHART_DATA[dept]) || [];
    const [a, b] = allocSlice(stu.depts[dept], pool.length);
    return pool.slice(a, b).find((c) => String(c.id) === chartId) || null;
  }, [dept, chartId, stu.depts]);

  if (!chart) return <Navigate to={deptQueuePath(dept)} replace />;

  return (
    <>
      <Header
        session={session}
        onLogout={logout}
        extra={
          <span className="who" style={{ color: 'var(--tone-9fb3c7)' }}>
            {'Coding · '}
            <b>{DEPTS[dept].name}</b>
            {saveState === 'saving' && (
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 800, color: 'var(--tone-9fb3c7)' }}>
                · saving…
              </span>
            )}
            {saveState === 'saved' && (
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 800, color: 'var(--tone-39d0b4)' }}>
                · saved ✓
              </span>
            )}
            {saveState === 'error' && (
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 800, color: 'var(--tone-ff6b6b)' }}>
                · NOT SAVED — check connection
              </span>
            )}
          </span>
        }
      />
      <Coder
        key={chart.id}
        chart={chart}
        codeDB={codeDB}
        dbStatus={dbStatus}
        saveState={saveState}
        onClose={() => navigate(deptQueuePath(dept))}
        onSubmit={(res) => {
          recordResult(chart.id, res, dept);
        }}
      />
    </>
  );
}

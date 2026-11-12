/* CODIVIA platform — full-screen coding page for one chart (header + coder, no sidebar).
   Data: GET /my-charts/:dept/charts/:chartId (record + patient, no answer key; only charts in
   the student's allocated range). Submitting goes to the server for scoring (StudentContext.submitChart). */
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../../components/layout/Header.jsx';
import { PageLoader } from '../../../components/ui/PageLoader.jsx';
import { useSession } from '../../../context/SessionContext.jsx';
import { useStudent } from '../../../context/StudentContext.jsx';
import { deptQueuePath } from '../../../routes/paths.js';
import { get } from '../../../services/apiHelper.js';
import { MY_CHART } from '../../../services/endpoints.js';
import { Coder } from './Coder.jsx';

// route: /charts/:dept/:chartId
export default function CoderPage() {
  const { dept, chartId } = useParams();
  const { logout } = useSession();
  const { session, stu, codeDB, dbStatus, saveState, submitChart } = useStudent();
  const navigate = useNavigate();
  const [chart, setChart] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChart(null);
    setMissing(false);
    get(MY_CHART(dept, chartId))
      .then((c) => !cancelled && setChart(c))
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
    };
  }, [dept, chartId]);

  if (!(stu.depts && stu.depts[dept] != null) || missing) return <Navigate to={deptQueuePath(dept)} replace />;
  if (!chart) return <PageLoader variant="full" label="Loading chart" />;

  return (
    <>
      <Header
        session={session}
        onLogout={logout}
        extra={
          <span className="who" style={{ color: 'var(--tone-9fb3c7)' }}>
            {'Coding · '}
            <b>{chart.deptName || dept}</b>
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
        onSubmit={(rows, drg) => submitChart(chart.id, rows, drg)}
      />
    </>
  );
}

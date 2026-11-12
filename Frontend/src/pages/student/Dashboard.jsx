import { DeptIcon } from '../../components/ui/DeptIcon.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { GuidelinesPanel } from '../../components/guidelines/GuidelinesPanel.jsx';
import { ElementTiles } from '../../components/ui/ElementTiles.jsx';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { deptQueuePath } from '../../routes/paths.js';
import { MY_CHARTS } from '../../services/endpoints.js';

// ---- Dashboard (landing tile) ----
// Data: GET /my-charts — department cards (10 per page) and `statistics`:
//   totalWorked, overallAvg, departments, certificates { threshold, anyCertified } — all from the database.
export function Dashboard({ stu, reloadKey, onGoDept }) {
  const list = useApiList(MY_CHARTS, { reloadKey });
  const st = list.data && list.data.statistics;

  return (
    <div>
      <div className="page-head">
        <h1>{'Welcome back, ' + stu.name.split(' ')[0]}</h1>
        <p>Work your allocated charts, track progress, and build your certificate and resume.</p>
      </div>
      {list.error && !list.data ? (
        <div className="cvx-msg err" role="alert">
          {list.error}
        </div>
      ) : !st ? (
        <PageLoader label="Loading your dashboard" />
      ) : (
        <>
          <div className="stat-row">
            <StatCard k="Charts Worked" v={st.totalWorked} s="across all depts" teal={true} />
            <StatCard k="Overall Accuracy" v={st.overallAvg + '%'} s="audited average" />
            <StatCard k="Departments" v={st.departments} s="allocated to you" />
            <StatCard
              k="Certificate"
              v={st.certificates.anyCertified ? 'Ready' : 'Locked'}
              s={st.certificates.anyCertified ? 'download now' : 'reach ' + st.certificates.threshold + ' charts'}
            />
          </div>
          <Card title="Your Departments">
            <div style={{ padding: 16 }}>
              {!list.total ? (
                <div style={{ padding: '26px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>No departments allocated yet</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
                    Your trainer assigns which coding departments you work. Once a department is allocated to your account it will
                    appear here with your chart queue.
                  </div>
                </div>
              ) : (
                <>
                  <div className="dept-grid">
                    {list.results.map((d) => (
                      <button type="button" key={d.key} className="dept-card" onClick={() => onGoDept(d.key)} aria-label={'Open ' + d.name + ' charts'}>
                        <div className="dept-card-head">
                          <div className="ico">
                            <DeptIcon dept={d.key} />
                          </div>
                          <h3>{d.name}</h3>
                        </div>
                        <ElementTiles dept={d} setting={d.group === 'setting'} />
                        <div className="alloc">
                          <span>Progress</span>
                          <b>{d.worked + ' / ' + d.assigned}</b>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                          {d.certified ? 'Certified · ' : ''}
                          {d.worked > 0 ? d.avg + '% avg accuracy' : 'Not started'}
                        </div>
                      </button>
                    ))}
                  </div>
                  <Pagination {...list.pagerProps} itemLabel="departments" />
                </>
              )}
            </div>
          </Card>
        </>
      )}
      <GuidelinesPanel />
    </div>
  );
}

// route: /dashboard
export default function DashboardPage() {
  const { stu, results } = useStudent();
  const navigate = useNavigate();
  // Reload after a chart is submitted, so the numbers stay current.
  return <Dashboard stu={stu} reloadKey={Object.keys(results).length} onGoDept={(dk) => navigate(deptQueuePath(dk))} />;
}

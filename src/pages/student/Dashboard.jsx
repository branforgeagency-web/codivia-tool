import { Card } from '../../components/ui/Card.jsx';
import { GuidelinesPanel } from '../../components/guidelines/GuidelinesPanel.jsx';
import { ElementTiles } from '../../components/ui/ElementTiles.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { CERT_THRESHOLD, DEPTS } from '../../config/constants.js';
import { deptHasCharts } from '../../utils/allocation.js';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext.jsx';
import { deptQueuePath } from '../../routes/paths.js';

// ---- Dashboard (landing tile) ----
export function Dashboard({ stu, stats, onGoDept }) {
  return (
    <div>
      <div className="page-head">
        <h1>{'Welcome back, ' + stu.name.split(' ')[0]}</h1>
        <p>Work your allocated charts, track progress, and build your certificate and resume.</p>
      </div>
      <div className="stat-row">
        <StatCard k="Charts Worked" v={stats.totalWorked} s="across all depts" teal={true} />
        <StatCard k="Overall Accuracy" v={stats.overallAvg + '%'} s="audited average" />
        <StatCard
          k="Departments"
          v={Object.keys(stu.depts).filter(deptHasCharts).length}
          s="allocated to you"
        />
        <StatCard
          k="Certificate"
          v={stats.anyCertified ? 'Ready' : 'Locked'}
          s={stats.anyCertified ? 'download now' : 'reach ' + CERT_THRESHOLD + ' charts'}
        />
      </div>
      <Card title="Your Departments">
        <div style={{ padding: 16 }}>
          {(function () {
            const entries = Object.entries(stu.depts).filter(
              ([dk]) => DEPTS[dk] && deptHasCharts(dk),
            );
            if (!entries.length) {
              return (
                <div style={{ padding: '26px 6px', textAlign: 'center' }}>
                  <div
                    style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}
                  >
                    No departments allocated yet
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--muted)',
                      lineHeight: 1.6,
                      maxWidth: 520,
                      margin: '0 auto',
                    }}
                  >
                    Your trainer assigns which coding departments you work. Once a department is
                    allocated to your account it will appear here with your chart queue.
                  </div>
                </div>
              );
            }
            return (
              <div className="dept-grid">
                {entries.map(([dk, alloc]) => {
                  const d = DEPTS[dk];
                  const st = stats.perDept[dk] || { worked: 0, avg: 0 };
                  return (
                    <div key={dk} className="dept-card" onClick={() => onGoDept(dk)}>
                      <div className="ico">{d.icon}</div>
                      <h3>{d.name}</h3>
                      <ElementTiles dept={d} setting={d.group === 'setting'} />
                      <div className="alloc">
                        <span>Progress</span>
                        <b>{st.worked + ' / ' + alloc}</b>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                        {st.worked > 0 ? st.avg + '% avg accuracy' : 'Not started'}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </Card>
      <GuidelinesPanel />
    </div>
  );
}

// route: /dashboard
export default function DashboardPage() {
  const { stu, stats } = useStudent();
  const navigate = useNavigate();
  return <Dashboard stu={stu} stats={stats} onGoDept={(dk) => navigate(deptQueuePath(dk))} />;
}

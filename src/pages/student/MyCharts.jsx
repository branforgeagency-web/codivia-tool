import { ElementTiles } from '../../components/ui/ElementTiles.jsx';
import { DEPTS } from '../../config/constants.js';
import { allocCount, allocRange, deptHasCharts } from '../../utils/allocation.js';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext.jsx';
import { deptQueuePath } from '../../routes/paths.js';

export function DeptSelect({ stu, stats, onSelect }) {
  return (
    <div>
      <div className="page-head">
        <h1>My Charts</h1>
        <p>Select a department to work your allocated charts.</p>
      </div>
      {(function () {
        const entries = Object.entries(stu.depts).filter(([dk]) => DEPTS[dk] && deptHasCharts(dk));
        if (!entries.length) {
          return (
            <div className="card" style={{ padding: '26px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>
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
                allocated to your account, its chart queue will appear here.
              </div>
            </div>
          );
        }
        return (
          <div className="dept-grid">
            {entries.map(([dk, alloc]) => {
              const d = DEPTS[dk];
              const st = stats.perDept[dk] || { worked: 0, avg: 0 };
              const pool = ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length;
              const _rng = allocRange(alloc, pool);
              const assigned = allocCount(alloc, pool);
              const remaining = Math.max(0, assigned - st.worked);
              const rangeLabel = _rng ? 'charts ' + _rng.start + '\u2013' + _rng.end : null;
              return (
                <div key={dk} className="dept-card" onClick={() => onSelect(dk)}>
                  <div className="ico">{d.icon}</div>
                  <h3>{d.name}</h3>
                  <ElementTiles dept={d} setting={d.group === 'setting'} />
                  <div className="alloc">
                    <span>{rangeLabel || 'Your allocation'}</span>
                    <b>{assigned}</b>
                  </div>
                  <div
                    className="dept-sub"
                    style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}
                  >
                    {st.worked + ' worked \u00b7 ' + remaining + ' remaining'}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

// route: /charts
export default function MyChartsPage() {
  const { stu, stats } = useStudent();
  const navigate = useNavigate();
  return <DeptSelect stu={stu} stats={stats} onSelect={(dk) => navigate(deptQueuePath(dk))} />;
}

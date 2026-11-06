import { Card } from '../../components/ui/Card.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { DEPTS, ELEMENT_LABELS } from '../../config/constants.js';
import { activeDeptKeys, deptHasCharts } from '../../utils/allocation.js';
import { useAdmin } from '../../context/AdminContext.jsx';

export function AdminOverview({ students, deptAlloc, totalAllocated, totalPool }) {
  return (
    <div>
      <div className="page-head">
        <h1>Admin Overview</h1>
        <p>All departments, chart pools, and student allocations across CODIVIA.</p>
      </div>
      <div className="stat-row">
        <StatCard k="Departments" v={activeDeptKeys().length} s="coding domains" teal={true} />
        <StatCard k="Total Chart Pool" v={totalPool.toLocaleString()} s="available to allocate" />
        <StatCard k="Allocated" v={totalAllocated.toLocaleString()} s="assigned to students" />
        <StatCard k="Students" v={students.length} s="active" />
      </div>
      <Card title="Department Chart Pools">
        <table>
          <thead>
            <tr>
              {['Department', 'Code Sets', 'Pool', 'Allocated', 'Available'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(DEPTS)
              .filter(([dk]) => deptHasCharts(dk))
              .map(([dk, d]) => {
                const alloc = deptAlloc[dk] || 0;
                const avail = d.pool - alloc;
                return (
                  <tr key={dk}>
                    <td>{d.icon + ' ' + d.name}</td>
                    <td>
                      <span style={{ color: 'var(--teal-d)', fontWeight: 700, fontSize: 12 }}>
                        {(d.elements || []).map((x) => ELEMENT_LABELS[x] || x).join(' · ')}
                      </span>
                    </td>
                    <td>{d.pool}</td>
                    <td>
                      <b>{alloc}</b>
                    </td>
                    <td>
                      <span style={{ color: avail > 0 ? 'var(--ok)' : 'var(--err)' }}>{avail}</span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// route: /admin/overview
export default function OverviewPage() {
  const { students, deptAlloc, totalAllocated, totalPool } = useAdmin();
  return (
    <AdminOverview
      students={students}
      deptAlloc={deptAlloc}
      totalAllocated={totalAllocated}
      totalPool={totalPool}
    />
  );
}

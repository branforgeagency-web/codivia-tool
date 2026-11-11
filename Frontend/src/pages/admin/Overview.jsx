import { useMemo } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { DEPTS, ELEMENT_LABELS } from '../../config/constants.js';
import { activeDeptKeys, deptHasCharts } from '../../utils/allocation.js';
import { useAdmin } from '../../context/AdminContext.jsx';

// Row fields match GET /departments/pools, so switching to the API only replaces `pools`.
const POOL_COLUMNS = [
  { key: 'name', header: 'Department', sortable: true, render: (d) => d.icon + ' ' + d.name },
  {
    key: 'elements',
    header: 'Code Sets',
    render: (d) => (
      <span style={{ color: 'var(--teal-d)', fontWeight: 700, fontSize: 12 }}>
        {(d.elements || []).map((x) => ELEMENT_LABELS[x] || x).join(' · ')}
      </span>
    ),
  },
  { key: 'pool', header: 'Pool', sortable: true },
  { key: 'allocated', header: 'Allocated', sortable: true, render: (d) => <b>{d.allocated}</b> },
  {
    key: 'available',
    header: 'Available',
    sortable: true,
    render: (d) => <span style={{ color: d.available > 0 ? 'var(--ok)' : 'var(--err)' }}>{d.available}</span>,
  },
];

export function AdminOverview({ students, deptAlloc, totalAllocated, totalPool, loading }) {
  const pools = useMemo(
    () =>
      Object.entries(DEPTS)
        .filter(([dk]) => deptHasCharts(dk))
        .map(([dk, d]) => {
          const pool = window.CHART_DATA[dk].length;
          const allocated = deptAlloc[dk] || 0;
          return { key: dk, name: d.name, icon: d.icon, elements: d.elements, pool, allocated, available: pool - allocated };
        }),
    [deptAlloc],
  );

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
        <DataTable
          className="dt-flush"
          columns={POOL_COLUMNS}
          data={pools}
          rowKey="key"
          itemLabel="departments"
          loading={loading}
          emptyMessage="No departments have charts yet."
        />
      </Card>
    </div>
  );
}

// route: /admin/overview
export default function OverviewPage() {
  const { students, loadingStudents, deptAlloc, totalAllocated, totalPool } = useAdmin();
  return (
    <AdminOverview
      students={students}
      deptAlloc={deptAlloc}
      totalAllocated={totalAllocated}
      totalPool={totalPool}
      loading={loadingStudents}
    />
  );
}

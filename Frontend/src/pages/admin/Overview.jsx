import { Card } from '../../components/ui/Card.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { ELEMENT_LABELS } from '../../config/constants.js';
import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { DEPARTMENT_POOLS } from '../../services/endpoints.js';

// Row fields: GET /department-pools results.
const POOL_COLUMNS = [
  { key: 'name', header: 'Department', sortable: true, render: (d) => d.name },
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

// Data: GET /department-pools — 10 rows per page, sorted by the server; analytics feed the stat cards.
export function AdminOverview({ reloadKey }) {
  const [sort, setSort] = useState(null); // { key, dir } from the table
  const list = useApiList(DEPARTMENT_POOLS, {
    params: { sortBy: sort ? sort.key : undefined, order: sort ? sort.dir : undefined },
    reloadKey,
  });
  const a = (list.data && list.data.analytics) || { departments: 0, totalPool: 0, allocated: 0, students: 0 };
  return (
    <div>
      <div className="page-head">
        <h1>Admin Overview</h1>
        <p>All departments, chart pools, and student allocations across CODIVIA.</p>
      </div>
      <div className="stat-row">
        <StatCard k="Departments" v={a.departments} s="coding domains" teal={true} />
        <StatCard k="Total Chart Pool" v={a.totalPool.toLocaleString()} s="available to allocate" />
        <StatCard k="Allocated" v={a.allocated.toLocaleString()} s="assigned to students" />
        <StatCard k="Students" v={a.students} s="active" />
      </div>
      {list.error && (
        <div className="cvx-msg err" role="alert">
          {list.error}
        </div>
      )}
      <Card title="Department Chart Pools">
        <DataTable
          className="dt-flush"
          columns={POOL_COLUMNS}
          data={list.results}
          rowKey="key"
          itemLabel="departments"
          loading={list.loading}
          serverSide
          totalCount={list.total}
          page={list.page}
          pageSize={10}
          pageSizeOptions={[10]}
          onPageChange={list.setPage}
          onSortChange={setSort}
          emptyMessage="No departments have charts yet."
        />
      </Card>
    </div>
  );
}

// route: /admin/overview
export default function OverviewPage() {
  const { version } = useAdmin();
  return <AdminOverview reloadKey={version} />;
}

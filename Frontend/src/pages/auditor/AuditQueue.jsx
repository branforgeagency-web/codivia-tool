/* CODIVIA platform — auditor Audit Queue (route: /auditor/queue).
   Submitted charts of the auditor's assigned students. Tabs: To audit / In progress / Audited / All;
   filters: department, priority (low auto-score), student (?student= from My Students), search.
   Data: GET /audits/queue (server-paged). Styles: .ad-* / .au-* in refinements.css */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { auditReviewPath } from '../../routes/paths.js';
import { AUDIT_QUEUE } from '../../services/endpoints.js';
import { ScorePill, StatusBadge, fmtDate, useWorkTypeLabel } from './auditUi.jsx';

const TABS = ['pending', 'draft', 'completed', 'all'];

export default function AuditQueue() {
  const workTypeLabel = useWorkTypeLabel();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = TABS.includes(params.get('status')) ? params.get('status') : 'pending';
  const student = params.get('student') || '';
  const dept = params.get('dept') || '';
  const priority = params.get('priority') === '1';
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim());

  // Filters live in the address bar, so "Back to queue" returns to the same view.
  const setParam = (key, value) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (value) n.set(key, value);
        else n.delete(key);
        return n;
      },
      { replace: true },
    );

  const list = useApiList(AUDIT_QUEUE, { params: { status, student, dept, priority: priority || undefined, search } });
  const data = list.data;
  const filters = (data && data.filters) || [];
  const departments = (data && data.departments) || [];
  const studentName = student && list.results[0] ? list.results[0].student.name : '';

  const columns = [
    {
      key: 'chart',
      header: 'Chart',
      render: (r) => (
        <span className="au-who">
          <b>{r.chart}</b>
          <small>{[r.title, workTypeLabel(r.workType)].filter(Boolean).join(' · ')}</small>
        </span>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <span className="au-who">
          <b>{r.student.name}</b>
          <small>{r.student.id}</small>
        </span>
      ),
    },
    { key: 'deptName', header: 'Department' },
    { key: 'at', header: 'Submitted', render: (r) => fmtDate(r.at) },
    { key: 'score', header: 'Score', align: 'right', render: (r) => <ScorePill row={r} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} priority={r.priority} /> },
    {
      key: 'open',
      header: '',
      align: 'right',
      render: (r) => (
        <button type="button" className={r.status === 'completed' ? 'sc-ghost' : 'dc-action'} onClick={() => navigate(auditReviewPath(r.student.uid, r.chart))}>
          {r.status === 'completed' ? 'View' : r.status === 'draft' ? 'Continue' : 'Audit'}
        </button>
      ),
    },
  ];

  return (
    <div className="ad">
      <div className="page-head">
        <h1>Audit Queue</h1>
        <p>
          Charts your assigned students submitted. Priority charts (auto-score below {data ? data.priorityBelow + '%' : 'the priority threshold'}) are listed first; a chart the
          student submits again comes back here.
        </p>
      </div>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Audit status">
          {filters.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={status === f.key} className={status === f.key ? 'on' : ''} onClick={() => setParam('status', f.key === 'pending' ? '' : f.key)}>
              {f.label}
              <span>{f.count}</span>
            </button>
          ))}
        </div>
        <label className="ad-search">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="sr-only">Search charts</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chart ID or student…" />
        </label>
      </div>

      <div className="au-filters">
        <label>
          <span>Department</span>
          <select value={dept} onChange={(e) => setParam('dept', e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.key} value={d.key}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="au-check">
          <input type="checkbox" checked={priority} onChange={(e) => setParam('priority', e.target.checked ? '1' : '')} /> Priority only
        </label>
        {student && (
          <span className="sc-chip">
            Student: {studentName || 'selected'}{' '}
            <button type="button" className="au-x" onClick={() => setParam('student', '')} aria-label="Clear student filter">
              ×
            </button>
          </span>
        )}
      </div>

      {list.error ? (
        <div className="cvx-msg err" role="alert">
          {list.error}
        </div>
      ) : (
        <div className="bc-table">
          <DataTable
            columns={columns}
            data={list.results}
            rowKey={(r) => r.student.uid + r.chart}
            itemLabel="charts"
            loading={list.loading}
            serverSide
            totalCount={list.total}
            page={list.page}
            pageSize={(data && data.limit) || 10}
            onPageChange={list.setPage}
            pageSizeOptions={[10]}
            onRowClick={(r) => navigate(auditReviewPath(r.student.uid, r.chart))}
            emptyMessage={status === 'pending' ? 'Nothing to audit here — all caught up.' : 'No charts match these filters.'}
          />
        </div>
      )}
    </div>
  );
}

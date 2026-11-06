import React from 'react';
import { useState } from 'react';
import { DEPTS } from '../../../config/constants.js';
import { BULK_DEPTS, BULK_SIZE, computeBulkPlan } from '../../../utils/bulkPlan.js';

export function BulkAllocateForm({ students, onApply, onClose }) {
  const { targets, plan } = React.useMemo(() => computeBulkPlan(students), [students]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);

  const poolInfo = BULK_DEPTS.map((dk) => {
    const pool = ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length;
    return (DEPTS[dk] ? DEPTS[dk].name : dk) + ' (' + pool + ')';
  }).join(', ');

  const apply = async () => {
    setBusy(true);
    setDone(0);
    await onApply(plan, (n) => setDone(n));
    setBusy(false);
    onClose();
  };

  return (
    <div>
      <div style={{ padding: '20px 22px 0' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
          Bulk allocate starter charts
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
          {'Assigns ' +
            BULK_SIZE +
            ' charts each in ' +
            poolInfo +
            ' to every student who currently has NO allocation. ' +
            'Ranges cycle through each pool so students get different starting points. Students who already have an allocation are left unchanged.'}
        </p>
      </div>
      <div style={{ padding: '16px 22px' }}>
        <div
          style={{
            background: 'var(--teal-lt)',
            border: '1px solid var(--tone-f0d8c2)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--teal-d)' }}>
            {targets.length}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
            students will be allocated
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            {students.length -
              targets.length +
              ' students already have allocations and will not be changed.'}
          </div>
        </div>
        {targets.length > 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {'Example — first student gets: ' +
              BULK_DEPTS.map((dk) => {
                const d = plan[0] && plan[0].depts[dk];
                return (
                  (DEPTS[dk] ? DEPTS[dk].name : dk) +
                  ' ' +
                  (d ? d.start + '\u2013' + d.end : '\u2014')
                );
              }).join(',  ')}
          </div>
        )}
        {busy && (
          <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 800, color: 'var(--teal-d)' }}>
            {'Allocating\u2026 ' + done + ' / ' + targets.length}
          </div>
        )}
      </div>
      <div className="result-actions">
        <button
          style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          style={{ background: 'var(--teal)', color: 'var(--color-white)' }}
          disabled={busy || targets.length === 0}
          onClick={apply}
        >
          {busy ? 'Working\u2026' : 'Allocate ' + targets.length + ' students'}
        </button>
      </div>
    </div>
  );
}

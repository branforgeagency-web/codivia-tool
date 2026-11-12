import { useEffect, useState } from 'react';
import { PageLoader } from '../../../components/ui/PageLoader.jsx';
import { get } from '../../../services/apiHelper.js';
import { ADMIN_STUDENTS_BULK } from '../../../services/endpoints.js';

// ---- Admin: bulk allocate starter charts. The plan is worked out on the server:
// GET /admin/students/bulk-allocate -> { departments: [{key,name,pool}], size, targets, unchanged, example }
// onApply() -> POST /admin/students/bulk-allocate (AdminContext.bulkAllocate). ----
export function BulkAllocateForm({ onApply, onClose }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get(ADMIN_STUDENTS_BULK)
      .then(setPreview)
      .catch((e) => setError(e.message || 'Could not load the plan.'));
  }, []);

  const apply = async () => {
    setBusy(true);
    await onApply();
    setBusy(false);
  };

  const poolInfo = preview ? preview.departments.map((d) => d.name + ' (' + d.pool + ')').join(', ') : '';

  return (
    <div>
      <div style={{ padding: '20px 22px 0' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>Bulk allocate starter charts</h2>
        {preview && (
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
            {'Assigns ' +
              preview.size +
              ' charts each in ' +
              poolInfo +
              ' to every student who currently has NO allocation. ' +
              'Ranges cycle through each pool so students get different starting points. Students who already have an allocation are left unchanged.'}
          </p>
        )}
      </div>
      <div style={{ padding: '16px 22px' }}>
        {error ? (
          <div className="cvx-msg err" role="alert">
            {error}
          </div>
        ) : !preview ? (
          <PageLoader variant="inline" label="Working out the plan" />
        ) : (
          <>
            <div
              style={{
                background: 'var(--teal-lt)',
                border: '1px solid var(--tone-f0d8c2)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--teal-d)' }}>{preview.targets}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>students will be allocated</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {preview.unchanged + ' students already have allocations and will not be changed.'}
              </div>
            </div>
            {preview.example && (
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {'Example — first student gets: ' +
                  preview.departments
                    .map((d) => {
                      const r = preview.example[d.key];
                      return d.name + ' ' + (r ? r.start + '–' + r.end : '—');
                    })
                    .join(',  ')}
              </div>
            )}
            {busy && <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 800, color: 'var(--teal-d)' }}>Allocating…</div>}
          </>
        )}
      </div>
      <div className="result-actions">
        <button style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }} disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          style={{ background: 'var(--teal)', color: 'var(--color-white)' }}
          disabled={busy || !preview || preview.targets === 0}
          onClick={apply}
        >
          {busy ? 'Working…' : 'Allocate ' + (preview ? preview.targets : 0) + ' students'}
        </button>
      </div>
    </div>
  );
}

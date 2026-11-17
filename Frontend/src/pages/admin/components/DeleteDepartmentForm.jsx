import { useState } from 'react';
import { DeptIcon } from '../../../components/ui/DeptIcon.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { del, patch } from '../../../services/apiHelper.js';
import { DEPARTMENT } from '../../../services/endpoints.js';

// ---- Admin: delete a department (Departments page → bin). DELETE /departments/:key.
// The server refuses while the department still has charts or upload drafts (charts would be
// orphaned); then the admin is offered "Set inactive" instead (PATCH { isActive: false }). ----

export function DeleteDepartmentForm({ dept, onClose, onDone }) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hasCharts = dept.pool > 0;
  const matches = confirm.trim().toUpperCase() === dept.key;

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
      onDone && onDone();
      onClose();
    } catch (e) {
      setError(e.message || 'Could not complete the action.');
    }
    setBusy(false);
  };
  const remove = () => matches && run(() => del(DEPARTMENT(dept.key)));
  const deactivate = () => run(() => patch(DEPARTMENT(dept.key), { isActive: false }));

  return (
    <Modal
      title="Delete department"
      subtitle={dept.key}
      icon={
        <span className="md-avatar" aria-hidden="true">
          <DeptIcon dept={dept.key} icon={dept.icon} />
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sc-ghost" onClick={onClose}>
            Cancel
          </button>
          {dept.isActive !== false && (
            <button type="button" className="sc-ghost" onClick={deactivate} disabled={busy}>
              Set inactive instead
            </button>
          )}
          {!hasCharts && (
            <button type="button" className="dc-action as-danger" onClick={remove} disabled={busy || !matches}>
              {busy ? 'Deleting…' : 'Delete department'}
            </button>
          )}
        </>
      }
    >
      {hasCharts ? (
        <div className="as-warn">
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
          <div>
            <b>{dept.name}</b> has {dept.pool.toLocaleString()} charts, so it can't be deleted (students' scores and allocations point at them).
            <br />
            Set it <b>inactive</b> to hide it from students — nothing is lost and you can switch it back on with Edit.
          </div>
        </div>
      ) : (
        <>
          <div className="as-warn">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            <div>
              <b>{dept.name}</b> has no charts. Deleting it removes the department and any empty allocations to it. This cannot be undone.
            </div>
          </div>
          <label className="as-field">
            <span>
              Type <b className="as-mono">{dept.key}</b> to confirm
            </span>
            <input value={confirm} autoFocus onChange={(e) => setConfirm(e.target.value)} placeholder={dept.key} onKeyDown={(e) => e.key === 'Enter' && remove()} />
          </label>
        </>
      )}
      {error && (
        <div className="cvx-msg err" role="alert" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </Modal>
  );
}

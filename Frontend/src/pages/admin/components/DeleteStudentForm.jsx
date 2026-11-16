import { useState } from 'react';
import { Avatar, Modal } from '../../../components/ui/Modal.jsx';
import { del } from '../../../services/apiHelper.js';
import { ADMIN_STUDENT } from '../../../services/endpoints.js';

// ---- Admin: delete a student (student card → Delete). DELETE /admin/students/:uid.
// Soft delete: the student can no longer sign in and leaves the list; their scores, allocations
// and certificates are kept for the records. The admin confirms by typing the Student ID. ----

export function DeleteStudentForm({ student, onClose, onDeleted }) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const matches = confirm.trim().toUpperCase() === String(student.id).toUpperCase();

  const remove = async () => {
    if (busy || !matches) return;
    setBusy(true);
    setError('');
    try {
      await del(ADMIN_STUDENT(student.uid));
      onDeleted && onDeleted(student);
      onClose();
    } catch (e) {
      setError(e.message || 'Could not delete the student.');
    }
    setBusy(false);
  };

  return (
    <Modal
      title="Delete student"
      subtitle={student.id}
      icon={<Avatar name={student.name} />}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sc-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="dc-action as-danger" onClick={remove} disabled={busy || !matches}>
            {busy ? 'Deleting…' : 'Delete student'}
          </button>
        </>
      }
    >
      <div className="as-warn">
        <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
        <div>
          <b>{student.name}</b> ({student.email}) will be signed out and can no longer sign in. They disappear from the Students list.
          <br />
          Their scores, allocations and certificates are kept for your records.
        </div>
      </div>
      <label className="as-field">
        <span>
          Type <b className="as-mono">{student.id}</b> to confirm
        </span>
        <input value={confirm} autoFocus onChange={(e) => setConfirm(e.target.value)} placeholder={student.id} onKeyDown={(e) => e.key === 'Enter' && remove()} />
      </label>
      {error && (
        <div className="cvx-msg err" role="alert" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </Modal>
  );
}

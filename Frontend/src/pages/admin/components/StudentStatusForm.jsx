import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { Avatar } from '../../../components/ui/Modal.jsx';
import { patch } from '../../../services/apiHelper.js';
import { ADMIN_STUDENT_STATUS } from '../../../services/endpoints.js';

// ---- Admin: disable or re-enable a student account (student card → Disable / Enable).
// PATCH /admin/students/:uid/status { status }. Disabling signs the student out everywhere and
// blocks sign-in; scores, allocations and certificates are kept, so enabling restores everything. ----

export function StudentStatusForm({ student, onClose, onSaved }) {
  const disabled = student.accountStatus === 'disabled';
  const setStatus = (status) => () => patch(ADMIN_STUDENT_STATUS(student.uid), { status });

  if (disabled) {
    return (
      <ConfirmDialog
        title="Enable student account?"
        subtitle={student.id}
        icon={<Avatar name={student.name} />}
        tone="ok"
        warning={
          <>
            <b>{student.name}</b> ({student.email}) will be able to sign in again, with the same charts, scores and certificates as before.
          </>
        }
        confirmLabel="Enable account"
        busyLabel="Enabling…"
        onConfirm={setStatus('active')}
        onDone={onSaved}
        onClose={onClose}
      />
    );
  }

  return (
    <ConfirmDialog
      title="Disable student account?"
      subtitle={student.id}
      icon={<Avatar name={student.name} />}
      tone="warn"
      warning={
        <>
          <b>{student.name}</b> ({student.email}) will be signed out at once and can't sign in while the account is disabled.
          <br />
          Their scores, allocations and certificates are kept. You can enable the account again at any time.
        </>
      }
      confirmLabel="Disable account"
      busyLabel="Disabling…"
      onConfirm={setStatus('disabled')}
      onDone={onSaved}
      onClose={onClose}
    />
  );
}

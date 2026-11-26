import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { Avatar } from '../../../components/ui/Modal.jsx';
import { patch } from '../../../services/apiHelper.js';
import { ADMIN_AUDITOR_STATUS, ADMIN_STUDENT_STATUS } from '../../../services/endpoints.js';

// ---- Admin: disable or re-enable a student or auditor account (user card → Disable / Enable).
// PATCH /admin/students/:uid/status or /admin/auditors/:uid/status { status }. Disabling signs the
// user out everywhere and blocks sign-in; their data is kept, so enabling restores everything. ----

export function StudentStatusForm({ student, role = 'student', onClose, onSaved }) {
  const isAuditor = role === 'auditor';
  const disabled = student.accountStatus === 'disabled';
  const endpoint = isAuditor ? ADMIN_AUDITOR_STATUS(student.uid) : ADMIN_STUDENT_STATUS(student.uid);
  const setStatus = (status) => () => patch(endpoint, { status });
  const kept = isAuditor ? 'Their student assignments and completed audits are kept.' : 'Their scores, allocations and certificates are kept.';
  const subtitle = isAuditor ? student.email : student.id;
  const who = isAuditor ? 'auditor' : 'student';

  if (disabled) {
    return (
      <ConfirmDialog
        title={`Enable ${who} account?`}
        subtitle={subtitle}
        icon={<Avatar name={student.name} />}
        tone="ok"
        warning={
          <>
            <b>{student.name}</b> ({student.email}) will be able to sign in again, with everything as before.
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
      title={`Disable ${who} account?`}
      subtitle={subtitle}
      icon={<Avatar name={student.name} />}
      tone="warn"
      warning={
        <>
          <b>{student.name}</b> ({student.email}) will be signed out at once and can't sign in while the account is disabled.
          <br />
          {kept} You can enable the account again at any time.
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

import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { DeptIcon } from '../../../components/ui/DeptIcon.jsx';
import { del, patch } from '../../../services/apiHelper.js';
import { DEPARTMENT } from '../../../services/endpoints.js';

// ---- Admin: delete a department (Departments page → bin). DELETE /departments/:key.
// Always asks first (ConfirmDialog). The server refuses while the department still has charts or
// upload drafts (charts would be orphaned), so then only "Set inactive" is offered
// (PATCH { isActive: false }). ----

export function DeleteDepartmentForm({ dept, onClose, onDone }) {
  const hasCharts = dept.pool > 0;
  const active = dept.isActive !== false;
  const deactivate = () => patch(DEPARTMENT(dept.key), { isActive: false });
  const icon = (
    <span className="md-avatar" aria-hidden="true">
      <DeptIcon dept={dept.key} icon={dept.icon} />
    </span>
  );

  if (hasCharts) {
    return (
      <ConfirmDialog
        title="Can't delete this department"
        subtitle={dept.key}
        icon={icon}
        tone="warn"
        warning={
          <>
            <b>{dept.name}</b> has {dept.pool.toLocaleString()} charts, so it can't be deleted (students' scores and allocations point at them).
            <br />
            {active ? (
              <>
                Set it <b>inactive</b> to hide it from students. Nothing is lost and you can switch it back on with Edit.
              </>
            ) : (
              <>It is already inactive, so students can't see it.</>
            )}
          </>
        }
        cancelLabel={active ? 'Cancel' : 'Close'}
        confirmLabel="Set inactive"
        busyLabel="Saving…"
        onConfirm={active ? deactivate : undefined}
        onDone={onDone}
        onClose={onClose}
      />
    );
  }

  return (
    <ConfirmDialog
      title="Delete department?"
      subtitle={dept.key}
      icon={icon}
      tone="danger"
      warning={
        <>
          You are about to permanently delete <b>{dept.name}</b>. It has no charts, so the department and any empty allocations to it will be
          removed.
          <br />
          <b>This cannot be undone.</b>
        </>
      }
      typeToConfirm={dept.key}
      confirmLabel="Delete department"
      busyLabel="Deleting…"
      onConfirm={() => del(DEPARTMENT(dept.key))}
      secondary={active ? { label: 'Set inactive instead', onClick: deactivate } : undefined}
      onDone={onDone}
      onClose={onClose}
    />
  );
}

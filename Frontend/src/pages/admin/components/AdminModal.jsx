import { AddStudentForm } from './AddStudentForm.jsx';
import { AllocateForm } from './AllocateForm.jsx';
import { BulkAllocateForm } from './BulkAllocateForm.jsx';
import { DeptAllocateForm } from './DeptAllocateForm.jsx';

// ---- Admin modals: allocate access, add student ----
/* CODIVIA-BUILD-CHARTS150-0830 */
export function AdminModal({
  modal,
  students,
  allocate,
  allocateMany,
  addStudent,
  bulkAllocate,
  onClose,
}) {
  // Manage access draws its own (wider) modal.
  if (modal.type === 'allocate') {
    return (
      <AllocateForm
        student={students.find((s) => s.id === modal.studentId)}
        students={students}
        allocateMany={allocateMany}
        onClose={onClose}
      />
    );
  }
  return (
    <div
      className="result-overlay"
      onClick={(ev) => {
        if (ev.target.className === 'result-overlay') onClose();
      }}
    >
      <div className="result-card" style={{ maxWidth: 520 }}>
        {modal.type === 'deptAllocate' && (
          <DeptAllocateForm
            deptKey={modal.dept}
            students={students}
            allocate={allocate}
            onClose={onClose}
          />
        )}
        {modal.type === 'addStudent' && (
          <AddStudentForm students={students} addStudent={addStudent} onClose={onClose} />
        )}
        {modal.type === 'bulkAllocate' && (
          <BulkAllocateForm students={students} onApply={bulkAllocate} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

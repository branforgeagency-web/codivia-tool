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
  return (
    <div
      className="result-overlay"
      onClick={(ev) => {
        if (ev.target.className === 'result-overlay') onClose();
      }}
    >
      <div className="result-card" style={{ maxWidth: 520 }}>
        {modal.type === 'allocate' && (
          <AllocateForm
            student={students.find((s) => s.id === modal.studentId)}
            students={students}
            allocate={allocate}
            allocateMany={allocateMany}
            onClose={onClose}
          />
        )}
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

import { useAdmin } from '../../../context/AdminContext.jsx';
import { AddStudentForm } from './AddStudentForm.jsx';
import { AllocateForm } from './AllocateForm.jsx';
import { BulkAllocateForm } from './BulkAllocateForm.jsx';
import { DeptAllocateForm } from './DeptAllocateForm.jsx';

// ---- Admin modals: manage access, department allocation, bulk allocate, add student ----
// Each form loads its own data from the API; saves go through AdminContext.
export function AdminModal({ modal, onClose }) {
  const { saveStudentAllocations, allocateDept, bulkAllocate, refreshAll } = useAdmin();

  // Manage access draws its own (wider) modal.
  if (modal.type === 'allocate') {
    return <AllocateForm student={modal.student} onSave={saveStudentAllocations} onClose={onClose} />;
  }
  return (
    <div
      className="result-overlay"
      onClick={(ev) => {
        if (ev.target.className === 'result-overlay') onClose();
      }}
    >
      <div className="result-card" style={{ maxWidth: 560 }}>
        {modal.type === 'deptAllocate' && <DeptAllocateForm deptKey={modal.dept} onSave={allocateDept} onClose={onClose} />}
        {modal.type === 'addStudent' && (
          <AddStudentForm
            addStudent={() => {
              refreshAll();
              onClose();
            }}
            onClose={onClose}
          />
        )}
        {modal.type === 'bulkAllocate' && <BulkAllocateForm onApply={bulkAllocate} onClose={onClose} />}
      </div>
    </div>
  );
}

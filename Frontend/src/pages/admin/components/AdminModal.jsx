import { useAdmin } from '../../../context/AdminContext.jsx';
import { useSession } from '../../../context/SessionContext.jsx';
import { AddStudentForm } from './AddStudentForm.jsx';
import { AssignStudentsForm } from './AssignStudentsForm.jsx';
import { AllocateForm } from './AllocateForm.jsx';
import { BulkAllocateForm } from './BulkAllocateForm.jsx';
import { DeleteDepartmentForm } from './DeleteDepartmentForm.jsx';
import { DepartmentForm } from './DepartmentForm.jsx';
import { EditStudentForm } from './EditStudentForm.jsx';
import { StudentStatusForm } from './StudentStatusForm.jsx';
import { DeptAllocateForm } from './DeptAllocateForm.jsx';

// ---- Admin modals: manage access, department allocation, bulk allocate,
// add / edit / disable student or auditor, assign students to an auditor, add / edit / delete department ----
// Each form loads its own data from the API; saves go through AdminContext.
export function AdminModal({ modal, onClose }) {
  const { saveStudentAllocations, allocateDept, bulkAllocate, refreshAll, setModal } = useAdmin();
  const { reloadSession } = useSession();
  // A department changed: refresh the lists and the department names/labels used across the app.
  const departmentsChanged = () => {
    refreshAll();
    reloadSession().catch((e) => console.error('reload departments', e));
  };

  // Manage access and Add student draw their own modal (components/ui/Modal).
  if (modal.type === 'allocate') {
    return <AllocateForm student={modal.student} onSave={saveStudentAllocations} onClose={onClose} />;
  }
  if (modal.type === 'addDepartment' || modal.type === 'editDepartment') {
    return <DepartmentForm dept={modal.type === 'editDepartment' ? modal.dept : null} onClose={onClose} onSaved={departmentsChanged} />;
  }
  if (modal.type === 'deleteDepartment') {
    return <DeleteDepartmentForm dept={modal.dept} onClose={onClose} onDone={departmentsChanged} />;
  }
  // modal.role: 'student' (default) or 'auditor' — the same forms serve both tabs of the Users page.
  if (modal.type === 'editStudent') {
    return <EditStudentForm student={modal.student} role={modal.role} onClose={onClose} onSaved={refreshAll} />;
  }
  if (modal.type === 'studentStatus') {
    return <StudentStatusForm student={modal.student} role={modal.role} onClose={onClose} onSaved={refreshAll} />;
  }
  if (modal.type === 'assignAuditor') {
    return <AssignStudentsForm auditor={modal.auditor} onClose={onClose} onSaved={refreshAll} />;
  }
  if (modal.type === 'addStudent') {
    return (
      <AddStudentForm
        role={modal.role}
        onClose={onClose}
        onCreated={refreshAll} // the new card and the statistics appear at once
        onAllocate={(student) => setModal({ type: 'allocate', student })} // straight on to Manage access
        onAssign={(auditor) => setModal({ type: 'assignAuditor', auditor })} // straight on to Assign students
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
      <div className="result-card" style={{ maxWidth: 560 }}>
        {modal.type === 'deptAllocate' && <DeptAllocateForm deptKey={modal.dept} onSave={allocateDept} onClose={onClose} />}
        {modal.type === 'bulkAllocate' && <BulkAllocateForm onApply={bulkAllocate} onClose={onClose} />}
      </div>
    </div>
  );
}

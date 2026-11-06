import { ElementTiles } from '../../components/ui/ElementTiles.jsx';
import { DEPTS } from '../../config/constants.js';
import { deptHasCharts } from '../../utils/allocation.js';
import { useAdmin } from '../../context/AdminContext.jsx';

export function AdminDepartments({ students, deptAlloc, onManage }) {
  const specialty = Object.entries(DEPTS).filter(
    ([dk, d]) => d.group === 'specialty' && deptHasCharts(dk),
  );
  const setting = Object.entries(DEPTS).filter(
    ([dk, d]) => d.group === 'setting' && deptHasCharts(dk),
  );
  const renderGrid = (list) => (
    <div className="dept-grid">
      {list.map(([dk, d]) => {
        const alloc = deptAlloc[dk] || 0;
        const studentCount = students.filter((s) => s.depts && s.depts[dk]).length;
        return (
          <div key={dk} className="dept-card" onClick={() => onManage(dk)}>
            <div className="ico">{d.icon}</div>
            <h3>{d.name}</h3>
            <ElementTiles dept={d} setting={d.group === 'setting'} />
            <div className="alloc">
              <span>Pool</span>
              <b>{((window.CHART_DATA && window.CHART_DATA[dk]) || []).length}</b>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              {alloc +
                ' allocated · ' +
                studentCount +
                ' student' +
                (studentCount !== 1 ? 's' : '')}
            </div>
          </div>
        );
      })}
    </div>
  );
  return (
    <div>
      <div className="page-head">
        <h1>Departments</h1>
        <p>
          {specialty.length +
            setting.length +
            ' active coding departments across two groups — specialty tracks and RCM setting domains. Chart pools vary by department.'}
        </p>
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--teal-d)',
          textTransform: 'uppercase',
          letterSpacing: '.5px',
          margin: '0 0 12px',
        }}
      >
        {'⬤ Specialty Tracks — by body system (' + specialty.length + ')'}
      </div>
      {renderGrid(specialty)}
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--terra)',
          textTransform: 'uppercase',
          letterSpacing: '.5px',
          margin: '26px 0 12px',
        }}
      >
        {'⬤ Setting / Type Domains — how RCM hires (' + setting.length + ')'}
      </div>
      {renderGrid(setting)}
    </div>
  );
}

// route: /admin/departments
export default function DepartmentsPage() {
  const { students, deptAlloc, setModal } = useAdmin();
  return (
    <AdminDepartments
      students={students}
      deptAlloc={deptAlloc}
      onManage={(dk) => setModal({ type: 'deptAllocate', dept: dk })}
    />
  );
}

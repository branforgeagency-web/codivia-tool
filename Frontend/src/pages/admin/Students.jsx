import { DEPTS } from '../../config/constants.js';
import { allocCount, allocRange } from '../../utils/allocation.js';
import { progressOf } from '../../utils/progress.js';
import { useAdmin } from '../../context/AdminContext.jsx';

export function AdminStudents({ students, onAllocate, onAdd, onPerf, onBulk }) {
  const totals = students.reduce(
    (acc, s) => {
      const p = progressOf(s);
      acc.worked += p.worked;
      acc.allocated += p.allocated;
      if (p.worked > 0) acc.active++;
      if (s.progressError) acc.errors++;
      return acc;
    },
    { worked: 0, allocated: 0, active: 0, errors: 0 },
  );
  const cell = (label, val, color) => (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '.04em',
          color: color || 'var(--muted)',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'inherit' }}>{val}</div>
    </div>
  );
  return (
    <div>
      <div
        className="page-head"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>Students</h1>
          <p>Students who have registered. Allocate department charts to each.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn"
            style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            onClick={onBulk}
          >
            ⚡ Bulk allocate
          </button>
          <button className="btn btn-teal" onClick={onAdd}>
            🔄 Refresh
          </button>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div
          style={{
            padding: '14px 16px',
            display: 'flex',
            gap: 26,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {cell('STUDENTS', students.length)}
          {cell('HAVE WORKED CHARTS', totals.active)}
          {cell('CHARTS COMPLETED', totals.worked)}
          {cell('TOTAL ALLOCATED', totals.allocated)}
          {totals.errors > 0 && cell('PROGRESS UNREADABLE', totals.errors, 'var(--tone-b4232a)')}
        </div>
      </div>
      {students.length === 0 ? (
        <div className="card">
          <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
            No students have registered yet. Once a student creates an account, tap Refresh to see
            them here.
          </div>
        </div>
      ) : (
        students.map((s) => (
          <div key={s.uid || s.id} className="card">
            <div className="card-h">
              <div>
                <h3>{s.name}</h3>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {s.id + (s.email ? ' · ' + s.email : '')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {(function () {
                  const p = progressOf(s);
                  if (s.progressError)
                    return (
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--tone-b4232a)' }}>
                        {'progress unreadable (' + s.progressError + ')'}
                      </span>
                    );
                  return (
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: p.worked > 0 ? 'var(--teal-d)' : 'var(--muted)',
                        }}
                      >
                        {p.worked + ' / ' + p.allocated}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                        {p.worked === 0
                          ? 'not started'
                          : 'worked' + (p.avg !== null ? ' · ' + p.avg + '% avg' : '')}
                      </div>
                    </div>
                  );
                })()}
                <button
                  className="btn"
                  style={{
                    background: 'var(--color-white)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                  }}
                  onClick={() => onPerf(s.id)}
                >
                  View performance
                </button>
                <button className="btn btn-teal" onClick={() => onAllocate(s.id)}>
                  Manage Access
                </button>
              </div>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {Object.keys(s.depts).length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  No departments allocated yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(s.depts).map(([dk, v]) => {
                    if (!DEPTS[dk]) return null;
                    const pool = ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length;
                    const rng = allocRange(v, pool);
                    const done = progressOf(s).byDept[dk] || 0;
                    const label = rng
                      ? DEPTS[dk].name +
                        ' · ' +
                        rng.start +
                        '\u2013' +
                        rng.end +
                        ' (' +
                        done +
                        '/' +
                        allocCount(v, pool) +
                        ')'
                      : DEPTS[dk].name + ' · ' + done + '/0';
                    return (
                      <span
                        key={dk}
                        style={{
                          background: 'var(--teal-lt)',
                          color: 'var(--teal-d)',
                          borderRadius: 7,
                          padding: '6px 12px',
                          fontSize: 12.5,
                          fontWeight: 700,
                        }}
                      >
                        {DEPTS[dk].icon + ' ' + label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// route: /admin/students
export default function StudentsPage() {
  const { students, refreshStudents, setModal, setPerfId } = useAdmin();
  return (
    <AdminStudents
      students={students}
      onAllocate={(sid) => setModal({ type: 'allocate', studentId: sid })}
      onAdd={refreshStudents}
      onPerf={(sid) => setPerfId(sid)}
      onBulk={() => setModal({ type: 'bulkAllocate' })}
    />
  );
}

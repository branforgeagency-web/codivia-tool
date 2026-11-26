import { useEffect, useMemo, useState } from 'react';
import { DeptIcon } from '../../../components/ui/DeptIcon.jsx';
import { Avatar, Modal } from '../../../components/ui/Modal.jsx';
import { PageLoader } from '../../../components/ui/PageLoader.jsx';
import { get, put } from '../../../services/apiHelper.js';
import { ADMIN_AUDITOR_ASSIGNMENTS } from '../../../services/endpoints.js';

// ---- Admin: assign students to an auditor, one department at a time (auditor card → Assign students).
// GET /admin/auditors/:uid/assignments            departments with allocated students (+ how many are this auditor's)
// GET /admin/auditors/:uid/assignments?dept=KEY   that department's students and who audits each one now
// PUT /admin/auditors/:uid/assignments { dept, students: [uid] }   replaces this auditor's list in that department
// A student has one auditor per department: ticking a student who has another auditor moves them here.
// Styles: .aa-* in styles/auditor.css ----

const initials = (name) =>
  String(name || '')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

// Filter chips above the student list.
const VIEWS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'mine', label: 'Assigned here', test: (s, picked) => picked.has(s.uid) },
  { key: 'none', label: 'No auditor', test: (s) => !s.auditor },
  { key: 'other', label: 'Other auditor', test: (s) => s.auditor && !s.mine },
];

export function AssignStudentsForm({ auditor, onClose, onSaved }) {
  const [departments, setDepartments] = useState(null);
  const [dept, setDept] = useState('');
  const [students, setStudents] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const [view, setView] = useState('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const loadDepartments = () =>
    get(ADMIN_AUDITOR_ASSIGNMENTS(auditor.uid))
      .then((r) => {
        setDepartments(r.departments);
        setDept((d) => d || (r.departments[0] && r.departments[0].key) || '');
      })
      .catch((e) => setError(e.message || 'Could not load departments'));

  useEffect(() => {
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditor.uid]);

  useEffect(() => {
    if (!dept) return;
    setStudents(null);
    setSaved('');
    setError('');
    setView('all');
    setQuery('');
    get(ADMIN_AUDITOR_ASSIGNMENTS(auditor.uid), { params: { dept } })
      .then((r) => {
        setStudents(r.students);
        setPicked(new Set(r.students.filter((s) => s.mine).map((s) => s.uid)));
      })
      .catch((e) => setError(e.message || 'Could not load students'));
  }, [auditor.uid, dept]);

  const original = useMemo(() => new Set((students || []).filter((s) => s.mine).map((s) => s.uid)), [students]);
  const added = [...picked].filter((u) => !original.has(u));
  const removed = [...original].filter((u) => !picked.has(u));
  const dirty = added.length + removed.length > 0;
  const moving = (students || []).filter((s) => picked.has(s.uid) && s.auditor && !s.mine);

  const term = query.trim().toLowerCase();
  const searched = (students || []).filter((s) => !term || `${s.name} ${s.id} ${s.email}`.toLowerCase().includes(term));
  const viewOf = VIEWS.find((v) => v.key === view) || VIEWS[0];
  const shown = searched.filter((s) => viewOf.test(s, picked));
  const allShownPicked = shown.length > 0 && shown.every((s) => picked.has(s.uid));

  const toggle = (uid) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });
  const pickShown = (on) =>
    setPicked((p) => {
      const n = new Set(p);
      shown.forEach((s) => (on ? n.add(s.uid) : n.delete(s.uid)));
      return n;
    });

  const switchDept = (key) => {
    if (key === dept) return;
    if (dirty && !window.confirm('You have unsaved changes in this department. Discard them?')) return;
    setDept(key);
  };

  const save = async () => {
    if (busy || !dirty) return;
    setBusy(true);
    setError('');
    try {
      const r = await put(ADMIN_AUDITOR_ASSIGNMENTS(auditor.uid), { dept, students: [...picked] });
      setStudents((list) => list.map((s) => (picked.has(s.uid) ? { ...s, mine: true, auditor: { uid: auditor.uid, name: auditor.name } } : s.mine ? { ...s, mine: false, auditor: null } : s)));
      setSaved(`Saved — ${auditor.name} audits ${r.students} student${r.students === 1 ? '' : 's'} in ${r.deptName}.`);
      loadDepartments();
      onSaved && onSaved();
    } catch (e) {
      setError(e.message || 'Could not save the assignment.');
    }
    setBusy(false);
  };

  const current = (departments || []).find((d) => d.key === dept);
  const totalAssigned = (departments || []).reduce((n, d) => n + d.mine, 0);

  return (
    <Modal
      size="lg"
      title={'Assign students — ' + auditor.name}
      subtitle={
        <>
          {auditor.email}
          {departments && (
            <span className="aa-sub-pill">
              {totalAssigned} student{totalAssigned === 1 ? '' : 's'} assigned in {departments.filter((d) => d.mine).length} department
              {departments.filter((d) => d.mine).length === 1 ? '' : 's'}
            </span>
          )}
        </>
      }
      icon={<Avatar name={auditor.name} />}
      onClose={onClose}
      footer={
        <>
          <div className="aa-foot-status">
            {dirty ? (
              <>
                <span className="aa-dot" aria-hidden="true" />
                <b>Unsaved changes</b>
                {added.length > 0 && <span className="aa-plus">+{added.length} added</span>}
                {removed.length > 0 && <span className="aa-minus">−{removed.length} removed</span>}
                <button type="button" className="aa-link" onClick={() => setPicked(new Set(original))}>
                  Discard
                </button>
              </>
            ) : students ? (
              <span className="aa-muted">
                {picked.size} of {students.length} selected
              </span>
            ) : null}
          </div>
          <button type="button" className="sc-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="dc-action" onClick={save} disabled={busy || !dirty}>
            {busy ? 'Saving…' : dirty ? `Save ${added.length + removed.length} change${added.length + removed.length === 1 ? '' : 's'}` : 'Save assignment'}
          </button>
        </>
      }
    >
      <p className="aa-hint">
        <i className="bi bi-info-circle" aria-hidden="true" /> Pick a department, then tick the students {auditor.name} should audit there. A student has one auditor per
        department.
      </p>
      {error && (
        <div className="cvx-msg err" role="alert">
          {error}
        </div>
      )}
      {!departments ? (
        <PageLoader variant="inline" label="Loading departments" />
      ) : !departments.length ? (
        <div className="aa-empty">
          <i className="bi bi-people" aria-hidden="true" />
          <h3>No students allocated yet</h3>
          <p>Allocate department charts to students first (Users → Students → Manage access), then assign them to an auditor.</p>
        </div>
      ) : (
        <div className="aa">
          <nav className="aa-depts" aria-label="Departments">
            <span className="aa-label">Departments</span>
            {departments.map((d) => (
              <button key={d.key} type="button" aria-current={dept === d.key ? 'true' : undefined} className={'aa-dept' + (dept === d.key ? ' on' : '')} onClick={() => switchDept(d.key)} title={d.name}>
                <span className="aa-dept-ico">
                  <DeptIcon dept={d.key} icon={d.icon} />
                </span>
                <span className="aa-dept-name">{d.name}</span>
              </button>
            ))}
          </nav>

          <section className="aa-panel">
            <header className="aa-panel-head">
              <div>
                <h3>{current ? current.name : ''}</h3>
                <span className="aa-muted">{students ? `${students.length} student${students.length === 1 ? '' : 's'} allocated` : 'Loading…'}</span>
              </div>
              <label className="aa-search">
                <i className="bi bi-search" aria-hidden="true" />
                <span className="sr-only">Search students</span>
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID or email" />
              </label>
            </header>

            <div className="aa-tools">
              <div className="aa-chips" role="tablist" aria-label="Show">
                {VIEWS.map((v) => (
                  <button key={v.key} type="button" role="tab" aria-selected={view === v.key} className={view === v.key ? 'on' : ''} onClick={() => setView(v.key)}>
                    {v.label}
                    <span>{searched.filter((s) => v.test(s, picked)).length}</span>
                  </button>
                ))}
              </div>
              <label className="aa-all">
                <input type="checkbox" checked={allShownPicked} disabled={!shown.length} onChange={(e) => pickShown(e.target.checked)} />
                Select {term || view !== 'all' ? 'shown' : 'all'}
              </label>
            </div>

            <div className="aa-list-wrap">
              {!students ? (
                <PageLoader variant="inline" label="Loading students" />
              ) : !shown.length ? (
                <div className="aa-empty small">
                  <i className="bi bi-search" aria-hidden="true" />
                  <p>{students.length ? 'No students match.' : 'No students are allocated to this department.'}</p>
                </div>
              ) : (
                <ul className="aa-list">
                  {shown.map((s) => {
                    const on = picked.has(s.uid);
                    const other = s.auditor && !s.mine ? s.auditor.name : '';
                    const status = on
                      ? other
                        ? { tone: 'warn', text: 'Moves from ' + other }
                        : s.mine
                          ? { tone: 'ok', text: 'Assigned' }
                          : { tone: 'brand', text: 'Will be assigned' }
                      : s.mine
                        ? { tone: 'danger', text: 'Will be removed' }
                        : other
                          ? { tone: 'muted', text: 'Auditor: ' + other }
                          : { tone: 'muted', text: 'No auditor' };
                    return (
                      <li key={s.uid}>
                        <label className={'aa-row' + (on ? ' on' : '') + (s.accountStatus === 'disabled' ? ' off' : '')}>
                          <input type="checkbox" checked={on} onChange={() => toggle(s.uid)} />
                          <span className="aa-av" aria-hidden="true">
                            {initials(s.name)}
                          </span>
                          <span className="aa-who">
                            <b>
                              {s.name}
                              {s.accountStatus === 'disabled' && <em> · disabled</em>}
                            </b>
                            <small>
                              {s.id} · {s.email}
                            </small>
                          </span>
                          <span className={'dc-badge ' + status.tone}>{status.text}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {moving.length > 0 && (
              <p className="aa-warn">
                <i className="bi bi-arrow-left-right" aria-hidden="true" /> {moving.length} student{moving.length === 1 ? '' : 's'} will move to {auditor.name} from another auditor.
              </p>
            )}
            {saved && !dirty && (
              <div className="cvx-msg ok" role="status">
                {saved}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

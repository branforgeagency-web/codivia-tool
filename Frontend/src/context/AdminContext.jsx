/* CODIVIA platform — admin state shared by every admin page through useAdmin():
   open modals, the error notice, totals for the header, and the allocation saves.
   Each page loads its own (paged) data from the API; `version` goes up after every change
   so those pages reload.
     GET /department-pools?limit=1               header totals (analytics)
     PUT /admin/students/:id/allocations         one student's whole allocation map (Manage Access)
     PUT /admin/departments/:dept/allocations    many students in one department
     POST /admin/students/bulk-allocate          starter charts for every unallocated student
     GET /admin/queries/pending-count            Physician Queries badge (re-checked every 30 s)
     GET /admin/work/summary                     Chart Activity badge: deferred + transferred charts */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { get, post, put } from '../services/apiHelper.js';
import {
  ADMIN_STUDENT_ALLOCATIONS,
  ADMIN_QUERIES_PENDING,
  ADMIN_WORK_SUMMARY,
  ADMIN_STUDENTS_BULK,
  DEPARTMENT_ALLOCATIONS,
  DEPARTMENT_POOLS,
} from '../services/endpoints.js';

const AdminContext = createContext(null);

export function useAdmin() {
  return useContext(AdminContext);
}

const BULK_CHUNK = 500;
const QUERY_POLL_MS = 30 * 1000; // new physician queries show up in the sidebar badge without a reload // the API's per-request maximum for department allocations

export function AdminProvider({ children }) {
  const [browseChart, setBrowseChart] = useState(null); // chart being previewed (full record)
  const [modal, setModal] = useState(null); // { type:'allocate', student } | { type:'deptAllocate', dept } | { type:'bulkAllocate' } | { type:'addStudent', role } | { type:'editStudent'|'studentStatus', student, role } | { type:'assignAuditor', auditor }
  const [perfStudent, setPerfStudent] = useState(null); // { uid, ... } whose performance panel is open
  const [notice, setNotice] = useState(null); // { tone: 'err'|'ok', text }
  const [totals, setTotals] = useState(null); // department-pools analytics: departments, totalPool, allocated, students
  const [version, setVersion] = useState(0);
  const [pendingQueries, setPendingQueries] = useState(0); // students' physician queries waiting for an answer
  const [workAttention, setWorkAttention] = useState(0); // charts students deferred or transferred

  const fail = useCallback((what, e) => {
    console.error(what, e);
    setNotice({ tone: 'err', text: what + ': ' + ((e && e.message) || 'request failed') });
  }, []);

  const loadTotals = useCallback(
    () =>
      get(DEPARTMENT_POOLS, { params: { limit: 1 } })
        .then((r) => setTotals(r.analytics || null))
        .catch((e) => fail('Could not load totals', e)),
    [fail],
  );
  useEffect(() => {
    loadTotals();
  }, [loadTotals, version]);

  // Physician Queries badge: on load, after every change, and every 30 s while the tab is visible.
  const loadPendingQueries = useCallback(
    () =>
      Promise.all([
        get(ADMIN_QUERIES_PENDING)
          .then((r) => setPendingQueries(r.pending || 0))
          .catch((e) => console.error('pending queries', e)),
        get(ADMIN_WORK_SUMMARY)
          .then((r) => setWorkAttention(r.attention || 0))
          .catch((e) => console.error('chart activity summary', e)),
      ]),
    [],
  );
  useEffect(() => {
    loadPendingQueries();
    const t = setInterval(() => document.visibilityState === 'visible' && loadPendingQueries(), QUERY_POLL_MS);
    return () => clearInterval(t);
  }, [loadPendingQueries, version]);

  // Every page re-reads its data.
  const refreshAll = useCallback(() => setVersion((v) => v + 1), []);

  // Manage Access: replace one student's whole map { DEPT: { start, end } }.
  const saveStudentAllocations = async (student, depts) => {
    setModal(null);
    try {
      await put(ADMIN_STUDENT_ALLOCATIONS(student.uid), { depts });
      setNotice({ tone: 'ok', text: 'Saved allocation for ' + student.name + '.' });
    } catch (e) {
      fail('Allocation for ' + student.name + ' was not saved', e);
    }
    refreshAll();
  };

  // One department, many students: rows = [{ uid, range: {start,end} | null }] (null removes).
  const allocateDept = async (deptKey, rows) => {
    setModal(null);
    try {
      for (let i = 0; i < rows.length; i += BULK_CHUNK) {
        const allocations = rows
          .slice(i, i + BULK_CHUNK)
          .map((r) => (r.range ? { userId: r.uid, start: r.range.start, end: r.range.end } : { userId: r.uid, start: null, end: null }));
        await put(DEPARTMENT_ALLOCATIONS(deptKey), { allocations });
      }
      setNotice({ tone: 'ok', text: 'Saved ' + rows.length + ' allocation change' + (rows.length === 1 ? '' : 's') + '.' });
    } catch (e) {
      fail('Department allocation was not saved', e);
    }
    refreshAll();
  };

  // Bulk allocate (the plan is worked out on the server).
  const bulkAllocate = async () => {
    try {
      const r = await post(ADMIN_STUDENTS_BULK);
      setNotice({ tone: 'ok', text: 'Allocated starter charts to ' + r.allocated + ' student' + (r.allocated === 1 ? '' : 's') + '.' });
    } catch (e) {
      fail('Bulk allocation failed', e);
    }
    setModal(null);
    refreshAll();
  };

  const value = {
    totals,
    pendingQueries,
    workAttention,
    version,
    refreshAll,
    saveStudentAllocations,
    allocateDept,
    bulkAllocate,
    modal,
    setModal,
    perfStudent,
    setPerfStudent,
    browseChart,
    setBrowseChart,
    notice,
    setNotice,
  };
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

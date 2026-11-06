/* CODIVIA platform — admin state: students, allocations, open modals.
   Shared by every admin page through useAdmin(). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { activeDeptKeys, allocCount } from '../utils/allocation.js';

const AdminContext = createContext(null);

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }) {
  const [browseChart, setBrowseChart] = useState(null); // chart being previewed
  // students loaded from Firestore (real registered users)
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [modal, setModal] = useState(null); // { type:'allocate'|'addStudent', ... }
  const [perfId, setPerfId] = useState(null); // studentId whose performance panel is open

  const refreshStudents = useCallback(() => {
    if (!window.CV_FB) {
      setLoadingStudents(false);
      return;
    }
    setLoadingStudents(true);
    window.CV_FB.listStudents()
      .then((list) => {
        setStudents(
          list.map((s) => ({
            ...s,
            depts: { ...s.depts },
            results: s.results || {},
            progressError: s.progressError || null,
          })),
        );
        setLoadingStudents(false);
      })
      .catch((e) => {
        console.error('listStudents', e);
        setStudents([]);
        setLoadingStudents(false);
      });
  }, []);
  useEffect(() => {
    refreshStudents();
  }, [refreshStudents]);

  // Persist a student's COMPLETE allocation map in one write.
  // Writing per-department raced: each call captured a stale depts snapshot and
  // fired its own Firestore write, so the last one to land overwrote the rest.
  // Bulk allocate: write ranges for many students, in batches, with progress.
  // Only students in the plan (those with no current allocation) are written.
  const bulkAllocate = async (plan, onProgress) => {
    if (!window.CV_FB) {
      return;
    }
    const BATCH = 25;
    let done = 0;
    for (let i = 0; i < plan.length; i += BATCH) {
      const slice = plan.slice(i, i + BATCH);
      await Promise.all(
        slice.map((row) => {
          const s = row.student;
          const depts = {};
          Object.entries(row.depts).forEach(([dk, r]) => {
            if (r && r.start >= 1 && r.end >= r.start) depts[dk] = { start: r.start, end: r.end };
          });
          if (!s.uid) return Promise.resolve();
          return window.CV_FB.setAllocation(s.uid, depts).catch((e) =>
            console.error('bulk setAllocation', s.id, e),
          );
        }),
      );
      done += slice.length;
      if (onProgress) onProgress(done);
    }
    // reflect locally without a full reload
    setStudents((list) =>
      list.map((s) => {
        const row = plan.find((r) => r.student.id === s.id);
        if (!row) return s;
        return { ...s, depts: { ...row.depts } };
      }),
    );
  };

  const allocateMany = (studentId, deptAlloc) => {
    setStudents((list) =>
      list.map((s) => {
        if (s.id !== studentId) return s;
        // deptAlloc entries are either {start,end} range objects or legacy numbers.
        const depts = {};
        Object.entries(deptAlloc).forEach(([dk, v]) => {
          if (v && typeof v === 'object') {
            const st = v.start | 0,
              en = v.end | 0;
            if (st >= 1 && en >= st) depts[dk] = { start: st, end: en };
          } else {
            const n = Number(v) || 0;
            if (n > 0) depts[dk] = { start: 1, end: n };
          }
        });
        if (s.uid && window.CV_FB) {
          window.CV_FB.setAllocation(s.uid, depts).catch((e) => console.error('setAllocation', e));
        }
        return { ...s, depts };
      }),
    );
    setModal(null);
  };
  // single-department helper (used by the per-department allocator)
  const allocate = (studentId, deptKey, val) => {
    setStudents((list) =>
      list.map((s) => {
        if (s.id !== studentId) return s;
        const depts = { ...s.depts };
        // val may be a {start,end} range object or a legacy number.
        if (val && typeof val === 'object' && val.start >= 1 && val.end >= val.start) {
          depts[deptKey] = { start: val.start | 0, end: val.end | 0 };
        } else {
          const n = Number(val) || 0;
          if (n > 0) depts[deptKey] = { start: 1, end: n };
          else delete depts[deptKey];
        }
        if (s.uid && window.CV_FB) {
          window.CV_FB.setAllocation(s.uid, depts).catch((e) => console.error('setAllocation', e));
        }
        return { ...s, depts };
      }),
    );
    setModal(null);
  };
  // students self-register now; this just refreshes the list from Firestore
  const addStudent = () => {
    refreshStudents();
    setModal(null);
  };

  // aggregate: charts allocated per department across all students
  const deptAlloc = useMemo(() => {
    const m = {};
    activeDeptKeys().forEach((dk) => (m[dk] = 0));
    students.forEach((s) =>
      Object.entries(s.depts || {}).forEach(([dk, v]) => {
        m[dk] =
          (m[dk] || 0) + allocCount(v, ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length);
      }),
    );
    return m;
  }, [students]);

  const totalAllocated = Object.values(deptAlloc).reduce((a, b) => a + b, 0);
  const totalPool = activeDeptKeys().reduce(
    (a, dk) => a + ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length,
    0,
  );

  const value = {
    students,
    loadingStudents,
    refreshStudents,
    bulkAllocate,
    allocateMany,
    allocate,
    addStudent,
    deptAlloc,
    totalAllocated,
    totalPool,
    modal,
    setModal,
    perfId,
    setPerfId,
    browseChart,
    setBrowseChart,
  };
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

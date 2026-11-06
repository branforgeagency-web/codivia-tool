// ============ BULK ALLOCATE (admin) ============
// Assigns a starter chart RANGE in EM, GENSURG, ED_PRO to every student who
// currently has NO allocation. Ranges CYCLE through each department pool so
// students get different starting points (no two adjacent students share a
// range until the pool is exhausted). Students who already have any allocation
// are never touched.
export const BULK_DEPTS = ['EM', 'GENSURG', 'ED_PRO'];

export const BULK_SIZE = 25;

export function computeBulkPlan(students) {
  // students with zero allocation
  const targets = students.filter((s) => !(s.depts && Object.keys(s.depts).length));
  const plan = []; // {student, depts:{dept:{start,end}}}
  // per-department rolling cursor
  const cursor = {};
  BULK_DEPTS.forEach((dk) => (cursor[dk] = 0));
  targets.forEach((st) => {
    const depts = {};
    BULK_DEPTS.forEach((dk) => {
      const pool = ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length;
      if (pool < 1) return;
      let start = cursor[dk] * BULK_SIZE + 1;
      // wrap when we run past the pool
      if (start > pool) {
        cursor[dk] = 0;
        start = 1;
      }
      let end = Math.min(start + BULK_SIZE - 1, pool);
      depts[dk] = { start, end };
      cursor[dk]++;
      // if this block reached the pool end, reset cursor for next student
      if (end >= pool) cursor[dk] = 0;
    });
    plan.push({ student: st, depts });
  });
  return { targets, plan };
}

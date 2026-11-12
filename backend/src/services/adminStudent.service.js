const { Allocation, ChartResult, Department, User } = require('../models');
const { STUDENT_STATUS_FILTERS, BULK_ALLOCATION } = require('../config/adminStudents');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const { escapeRegex } = require('../utils/codeText');
const { LIVE_STUDENT, countCharts, rangeCount } = require('./allocation.service');

// ---------- Admin Students page ----------

const fieldError = (field, message) => new ApiError(httpStatus.BAD_REQUEST, message, [{ field, message }]);
const notFound = () => new ApiError(httpStatus.NOT_FOUND, 'Student not found');
const average = (sum, n) => (n ? Math.round(sum / n) : null);

// Allocations as the frontend's `depts` map: { DEPT: { start, end } }.
const deptsMap = (rows) => Object.fromEntries(rows.map((a) => [a.dept, { start: a.start, end: a.end }]));

const groupBy = (rows, key) => {
  const m = new Map();
  rows.forEach((r) => {
    const k = String(r[key]);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  });
  return m;
};

const findLiveStudent = async (userId) => {
  const s = await User.findOne({ _id: userId, ...LIVE_STUDENT }).select('name email studentId createdAt lastLoginAt').lean();
  if (!s) throw notFound();
  return s;
};

const studentView = (s) => ({
  uid: String(s._id),
  id: s.studentId || String(s._id),
  name: s.name || s.email,
  email: s.email,
  createdAt: s.createdAt,
  lastLoginAt: s.lastLoginAt,
});

// Every active student as a card: allocated departments (with progress) + overall progress + status.
// Worked out from aggregates, so the full score history is never loaded for the list.
const buildCards = async () => {
  const students = await User.find(LIVE_STUDENT).select('name email studentId createdAt lastLoginAt').sort({ name: 1, _id: 1 }).lean();
  const ids = students.map((s) => s._id);
  const [allocations, scores, pools, departments] = await Promise.all([
    Allocation.find({ student: { $in: ids } }).select('student dept start end').lean(),
    ChartResult.aggregate([
      { $match: { student: { $in: ids } } },
      { $group: { _id: { student: '$student', dept: '$dept' }, n: { $sum: 1 }, sum: { $sum: '$accuracy' } } },
    ]),
    countCharts(),
    Department.find().select('name order').lean(),
  ]);
  const nameOf = new Map(departments.map((d) => [d._id, d.name]));
  const orderOf = new Map(departments.map((d) => [d._id, d.order]));
  const allocBy = groupBy(allocations, 'student');
  const scoresBy = groupBy(scores.map((s) => ({ ...s._id, n: s.n, sum: s.sum })), 'student');

  return students.map((s) => {
    const myScores = scoresBy.get(String(s._id)) || [];
    const workedIn = Object.fromEntries(myScores.map((x) => [x.dept, x.n]));
    const depts = (allocBy.get(String(s._id)) || [])
      .filter((a) => pools[a.dept] > 0)
      .sort((a, b) => (orderOf.get(a.dept) ?? 999) - (orderOf.get(b.dept) ?? 999))
      .map((a) => {
        const pool = pools[a.dept];
        const assigned = rangeCount(a.start, a.end, pool);
        const worked = workedIn[a.dept] || 0;
        return { key: a.dept, name: nameOf.get(a.dept) || a.dept, start: a.start, end: Math.min(a.end, pool), assigned, worked, complete: assigned > 0 && worked >= assigned };
      });
    const worked = myScores.reduce((n, x) => n + x.n, 0);
    const progress = {
      worked,
      allocated: depts.reduce((n, d) => n + d.assigned, 0),
      avg: average(myScores.reduce((n, x) => n + x.sum, 0), worked),
    };
    const status = !depts.length ? 'unallocated' : worked > 0 ? 'active' : 'idle';
    return { ...studentView(s), status, progress, departments: depts };
  });
};

// Students page: cards (search + status filter + pages), the stat tiles and the filter tab counts.
// Statistics and tab counts cover every student; search, status and page only change `results`.
const queryStudents = async ({ search, status = 'all', page = 1, limit = 10 }) => {
  const all = await buildCards();
  const term = (search || '').toLowerCase();
  const searched = term ? all.filter((s) => `${s.name} ${s.id} ${s.email}`.toLowerCase().includes(term)) : all;
  const matched = status === 'all' ? searched : searched.filter((s) => s.status === status);
  const countOf = (key) => (key === 'all' ? all.length : all.filter((s) => s.status === key).length);

  return {
    results: matched.slice((page - 1) * limit, page * limit),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(matched.length / limit)),
    totalResults: matched.length,
    filters: STUDENT_STATUS_FILTERS.map((f) => ({ ...f, count: countOf(f.key) })),
    statistics: {
      students: all.length,
      active: countOf('active'),
      worked: all.reduce((n, s) => n + s.progress.worked, 0),
      allocated: all.reduce((n, s) => n + s.progress.allocated, 0),
      unallocated: countOf('unallocated'),
    },
  };
};

// Performance panel: one student and every saved score ({ chartId: { dept, accuracy, ... } }),
// plus department names for the labels.
const getStudent = async (userId) => {
  const s = await findLiveStudent(userId);
  const [results, departments] = await Promise.all([
    ChartResult.find({ student: s._id }).select('-_id -student').lean(),
    Department.find().select('name').lean(),
  ]);
  return {
    ...studentView(s),
    results: Object.fromEntries(results.map(({ chart, ...saved }) => [chart, saved])),
    departmentNames: Object.fromEntries(departments.map((d) => [d._id, d.name])),
  };
};

// Manage Access form: every active department with charts, this student's range in it, and the
// other students' ranges there (so the form can flag overlaps while typing).
const getStudentAllocations = async (userId) => {
  const s = await findLiveStudent(userId);
  const [departments, pools, liveIds] = await Promise.all([
    Department.find({ isActive: true }).select('name icon group elements order').sort({ order: 1, _id: 1 }).lean(),
    countCharts(),
    User.find(LIVE_STUDENT).distinct('_id'),
  ]);
  const withCharts = departments.filter((d) => pools[d._id] > 0);
  const [allocations, names] = await Promise.all([
    Allocation.find({ dept: { $in: withCharts.map((d) => d._id) }, student: { $in: liveIds } }).select('student dept start end').lean(),
    User.find({ _id: { $in: liveIds } }).select('name email').lean(),
  ]);
  const nameOf = new Map(names.map((u) => [String(u._id), u.name || u.email]));
  const byDept = groupBy(allocations, 'dept');

  return {
    student: studentView(s),
    departments: withCharts.map((d) => {
      const rows = byDept.get(d._id) || [];
      const mine = rows.find((a) => String(a.student) === String(s._id));
      return {
        key: d._id,
        name: d.name,
        icon: d.icon,
        group: d.group,
        elements: d.elements,
        pool: pools[d._id],
        range: mine ? { start: mine.start, end: mine.end } : null,
        others: rows.filter((a) => a !== mine).map((a) => ({ name: nameOf.get(String(a.student)) || '', start: a.start, end: a.end })),
      };
    }),
  };
};

// Manage Access save: replace one student's whole allocation map. Departments left out lose access.
// Everything is checked first, so either the whole map is saved or nothing is.
const setStudentAllocations = async (userId, depts) => {
  const student = await findLiveStudent(userId);
  const keys = Object.keys(depts);
  const [found, pools] = await Promise.all([Department.find({ _id: { $in: keys } }).select('name').lean(), countCharts()]);
  const nameOf = new Map(found.map((d) => [d._id, d.name]));
  keys.forEach((k) => {
    if (!nameOf.has(k)) throw fieldError(`depts.${k}`, `Department ${k} not found`);
    const pool = pools[k] || 0;
    if (!pool) throw fieldError(`depts.${k}`, `${nameOf.get(k)} has no charts to allocate`);
    if (depts[k].end > pool) throw fieldError(`depts.${k}.end`, `${nameOf.get(k)}: end must be ${pool} or less`);
  });

  await Allocation.bulkWrite(
    [
      { deleteMany: { filter: { student: student._id, dept: { $nin: keys } } } },
      ...keys.map((k) => ({
        updateOne: { filter: { student: student._id, dept: k }, update: { $set: { start: depts[k].start, end: depts[k].end } }, upsert: true },
      })),
    ],
    { ordered: true }
  );
  const saved = await Allocation.find({ student: student._id }).select('dept start end').lean();
  return { uid: String(student._id), depts: deptsMap(saved) };
};

// ---------- Bulk allocate starter charts ----------
// Every active student with NO allocation gets BULK_ALLOCATION.size charts in each starter department.
// Ranges cycle through each pool so students start at different charts. Students who already have
// any allocation are never touched.
const bulkPlan = async () => {
  const [students, allocated, departments, pools] = await Promise.all([
    User.find(LIVE_STUDENT).select('_id').sort({ name: 1, _id: 1 }).lean(),
    Allocation.distinct('student'),
    Department.find({ _id: { $in: BULK_ALLOCATION.depts } }).select('name').lean(),
    countCharts(BULK_ALLOCATION.depts),
  ]);
  const has = new Set(allocated.map(String));
  const targets = students.filter((s) => !has.has(String(s._id)));
  const depts = BULK_ALLOCATION.depts
    .map((key) => ({ key, name: departments.find((d) => d._id === key)?.name || key, pool: pools[key] || 0 }))
    .filter((d) => d.pool > 0);

  const size = BULK_ALLOCATION.size;
  const cursor = Object.fromEntries(depts.map((d) => [d.key, 0]));
  const plan = targets.map((s) => {
    const ranges = {};
    depts.forEach(({ key, pool }) => {
      let start = cursor[key] * size + 1;
      if (start > pool) {
        cursor[key] = 0;
        start = 1;
      }
      const end = Math.min(start + size - 1, pool);
      ranges[key] = { start, end };
      cursor[key] = end >= pool ? 0 : cursor[key] + 1;
    });
    return { student: s._id, ranges };
  });
  return { depts, size, plan, students: students.length };
};

const previewBulkAllocation = async () => {
  const { depts, size, plan, students } = await bulkPlan();
  return {
    departments: depts,
    size,
    targets: plan.length,
    unchanged: students - plan.length,
    example: plan[0]?.ranges || null,
  };
};

const applyBulkAllocation = async () => {
  const { plan } = await bulkPlan();
  const ops = plan.flatMap(({ student, ranges }) =>
    Object.entries(ranges).map(([dept, r]) => ({
      updateOne: { filter: { student, dept }, update: { $set: { start: r.start, end: r.end } }, upsert: true },
    }))
  );
  if (ops.length) await Allocation.bulkWrite(ops, { ordered: false });
  return { allocated: plan.length };
};

module.exports = {
  queryStudents,
  getStudent,
  getStudentAllocations,
  setStudentAllocations,
  previewBulkAllocation,
  applyBulkAllocation,
};

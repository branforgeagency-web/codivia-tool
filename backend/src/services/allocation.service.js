const { Allocation, Chart, Department, User } = require('../models');
const { ROLES } = require('../config/roles');
const { USER_STATUS } = require('../config/userStatus');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const { escapeRegex } = require('../utils/codeText');

// Only active, not-deleted students count and can be allocated charts.
const LIVE_STUDENT = Object.freeze({ role: ROLES.STUDENT, status: USER_STATUS.ACTIVE, deletedAt: null });

const fieldError = (field, message) => new ApiError(httpStatus.BAD_REQUEST, message, [{ field, message }]);

// ---------- shared counting (used by the admin Departments and Overview APIs) ----------

// { CARDIO: 600, ... }: charts per department.
const countCharts = async () => {
  const rows = await Chart.aggregate([{ $group: { _id: '$dept', n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
};

// Charts in a range once it is clamped to the department's pool (the frontend's allocCount).
const rangeCount = (start, end, pool) => {
  if (!pool) return 0;
  const from = Math.min(start, pool);
  const to = Math.max(from, Math.min(end, pool));
  return to - from + 1;
};

// Allocation totals for active students:
//   byDept[dept] = { allocated, students }, plus how many students have any department.
const summarize = async (pools) => {
  const ids = await User.find(LIVE_STUDENT).distinct('_id');
  const rows = await Allocation.find({ student: { $in: ids } }).select('student dept start end').lean();
  const byDept = {};
  const assigned = new Set();
  rows.forEach((r) => {
    const count = rangeCount(r.start, r.end, pools[r.dept] || 0);
    if (!count) return;
    const d = (byDept[r.dept] ||= { allocated: 0, students: 0 });
    d.allocated += count;
    d.students += 1;
    assigned.add(String(r.student));
  });
  return { byDept, assignedStudents: assigned.size, students: ids.length };
};

// ---------- Manage allocation (one department) ----------

const findDepartment = async (key) => {
  const [dept, pool] = await Promise.all([Department.findById(key).select('name group isActive').lean(), Chart.countDocuments({ dept: key })]);
  if (!dept) throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
  return { key: dept._id, name: dept.name, group: dept.group, isActive: dept.isActive, pool };
};

const checkRange = (department, start, end) => {
  if (!department.pool) throw new ApiError(httpStatus.BAD_REQUEST, `${department.name} has no charts to allocate`);
  if (end > department.pool) throw fieldError('end', `end must be ${department.pool} or less (the department has ${department.pool} charts)`);
};

const studentView = (s) => ({ id: String(s._id), name: s.name, email: s.email, studentId: s.studentId });

// Other students whose range in this department overlaps [start, end]. Overlaps are allowed
// (two students may share charts), so they are reported, not refused.
const overlapsOf = (userId, start, end, allocations, students) =>
  allocations
    .filter((a) => String(a.student) !== String(userId) && a.start <= end && a.end >= start && students.has(String(a.student)))
    .map((a) => {
      const s = students.get(String(a.student));
      return { ...studentView(s), from: Math.max(start, a.start), to: Math.min(end, a.end) };
    });

const allocationView = (a, pool) => (a ? { start: a.start, end: a.end, count: rangeCount(a.start, a.end, pool) } : null);

// Every active student with their range in this department (or null), for the Manage allocation screen.
const queryAllocations = async (deptKey, { search, assigned = 'all', page = 1, limit = 10 }) => {
  const department = await findDepartment(deptKey);
  const [students, allocations] = await Promise.all([
    User.find(LIVE_STUDENT).select('name email studentId').sort({ name: 1, _id: 1 }).lean(),
    Allocation.find({ dept: deptKey }).select('student start end').lean(),
  ]);
  const studentById = new Map(students.map((s) => [String(s._id), s]));
  const live = allocations.filter((a) => studentById.has(String(a.student)));
  const byStudent = new Map(live.map((a) => [String(a.student), a]));

  let rows = students;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    rows = rows.filter((s) => pattern.test(s.name) || pattern.test(s.email) || pattern.test(s.studentId || ''));
  }
  if (assigned !== 'all') rows = rows.filter((s) => byStudent.has(String(s._id)) === (assigned === 'assigned'));

  const allocated = live.reduce((n, a) => n + rangeCount(a.start, a.end, department.pool), 0);
  const results = rows.slice((page - 1) * limit, page * limit).map((s) => {
    const a = byStudent.get(String(s._id));
    return {
      student: studentView(s),
      allocation: allocationView(a, department.pool),
      overlaps: a ? overlapsOf(s._id, a.start, a.end, live, studentById) : [],
    };
  });

  return {
    department,
    summary: { students: students.length, assigned: live.length, unassigned: students.length - live.length, allocated, available: department.pool - allocated },
    results,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(rows.length / limit)),
    totalResults: rows.length,
  };
};

const findLiveStudents = async (ids) => {
  const found = await User.find({ _id: { $in: ids }, ...LIVE_STUDENT }).select('name email studentId').lean();
  return new Map(found.map((s) => [String(s._id), s]));
};

// Give one student charts start..end of this department (replaces any range they had).
const setAllocation = async (deptKey, userId, { start, end }) => {
  const department = await findDepartment(deptKey);
  checkRange(department, start, end);
  const students = await findLiveStudents([userId]);
  if (!students.has(String(userId))) throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');

  await Allocation.updateOne({ student: userId, dept: deptKey }, { $set: { start, end } }, { upsert: true });

  const others = await Allocation.find({ dept: deptKey, student: { $ne: userId } }).select('student start end').lean();
  const otherStudents = await findLiveStudents(others.map((a) => a.student));
  return {
    department,
    student: studentView(students.get(String(userId))),
    allocation: allocationView({ start, end }, department.pool),
    overlaps: overlapsOf(userId, start, end, others, otherStudents),
  };
};

// Take away a student's access to this department.
const removeAllocation = async (deptKey, userId) => {
  await findDepartment(deptKey);
  const { deletedCount } = await Allocation.deleteOne({ student: userId, dept: deptKey });
  if (!deletedCount) throw new ApiError(httpStatus.NOT_FOUND, 'This student has no allocation in this department');
};

// The Manage allocation form's "Save": many students at once. A range sets it; start/end null removes it.
// Everything is checked first, so either all rows are saved or none.
const saveAllocations = async (deptKey, items) => {
  const department = await findDepartment(deptKey);
  const ids = items.map((i) => i.userId);
  const students = await findLiveStudents(ids);
  const missing = ids.filter((id) => !students.has(id));
  if (missing.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Some students were not found',
      missing.map((id) => ({ field: 'allocations', message: `Student ${id} not found` }))
    );
  }
  items.filter((i) => i.start != null).forEach((i) => checkRange(department, i.start, i.end));

  const ops = items.map((i) =>
    i.start == null
      ? { deleteOne: { filter: { student: i.userId, dept: deptKey } } }
      : { updateOne: { filter: { student: i.userId, dept: deptKey }, update: { $set: { start: i.start, end: i.end } }, upsert: true } }
  );
  if (ops.length) await Allocation.bulkWrite(ops, { ordered: false });
  return { department, saved: items.filter((i) => i.start != null).length, removed: items.filter((i) => i.start == null).length };
};

module.exports = { LIVE_STUDENT, countCharts, rangeCount, summarize, queryAllocations, setAllocation, removeAllocation, saveAllocations };

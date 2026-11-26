const { Allocation, AuditAssignment, ChartAudit, Department, User } = require('../models');
const { AUDITOR_STATUS_FILTERS, AUDIT_STATUS } = require('../config/auditors');
const { ROLES } = require('../config/roles');
const { USER_STATUS } = require('../config/userStatus');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const userService = require('./user.service');

// ---------- Admin Users page → Auditors tab ----------
// Auditor accounts (admin-created only) and which students each one audits, per department.

const LISTED_AUDITOR = Object.freeze({ role: ROLES.AUDITOR, deletedAt: null });
const LISTED_STUDENT = Object.freeze({ role: ROLES.STUDENT, deletedAt: null });
const AUDITOR_FIELDS = 'name email phone organization status createdAt lastLoginAt';

const notFound = () => new ApiError(httpStatus.NOT_FOUND, 'Auditor not found');
const fieldError = (field, message) => new ApiError(httpStatus.BAD_REQUEST, message, [{ field, message }]);

const findAuditor = async (userId) => {
  const a = await User.findOne({ _id: userId, ...LISTED_AUDITOR }).select(AUDITOR_FIELDS).lean();
  if (!a) throw notFound();
  return a;
};

const auditorView = (a) => ({
  uid: String(a._id),
  id: String(a._id),
  name: a.name || a.email,
  email: a.email,
  phone: a.phone || '',
  organization: a.organization || '',
  accountStatus: a.status === USER_STATUS.DISABLED ? USER_STATUS.DISABLED : USER_STATUS.ACTIVE,
  createdAt: a.createdAt,
  lastLoginAt: a.lastLoginAt,
});
const plain = (user) => (user.toObject ? user.toObject() : user);

// Every auditor as a card: departments with the number of students assigned, and audit counts.
const buildCards = async () => {
  const auditors = await User.find(LISTED_AUDITOR).select(AUDITOR_FIELDS).sort({ name: 1, _id: 1 }).lean();
  const ids = auditors.map((a) => a._id);
  const [assigned, audits, departments] = await Promise.all([
    AuditAssignment.aggregate([{ $match: { auditor: { $in: ids } } }, { $group: { _id: { auditor: '$auditor', dept: '$dept' }, n: { $sum: 1 } } }]),
    ChartAudit.aggregate([{ $match: { auditor: { $in: ids } } }, { $group: { _id: { auditor: '$auditor', status: '$status' }, n: { $sum: 1 } } }]),
    Department.find().select('name order').lean(),
  ]);
  const deptOf = new Map(departments.map((d) => [d._id, d]));
  return auditors.map((a) => {
    const mine = assigned.filter((x) => String(x._id.auditor) === String(a._id));
    const depts = mine
      .map((x) => ({ key: x._id.dept, name: (deptOf.get(x._id.dept) || {}).name || x._id.dept, students: x.n, order: (deptOf.get(x._id.dept) || {}).order ?? 999 }))
      .sort((x, y) => x.order - y.order)
      .map(({ order, ...d }) => d);
    const count = (status) => (audits.find((x) => String(x._id.auditor) === String(a._id) && x._id.status === status) || {}).n || 0;
    const view = auditorView(a);
    const status = view.accountStatus === USER_STATUS.DISABLED ? 'disabled' : depts.length ? 'assigned' : 'unassigned';
    return {
      ...view,
      status,
      departments: depts,
      progress: { assignments: depts.reduce((n, d) => n + d.students, 0), completed: count(AUDIT_STATUS.COMPLETED), inProgress: count(AUDIT_STATUS.DRAFT) },
    };
  });
};

const queryAuditors = async ({ search, status = 'all', page = 1, limit = 10 }) => {
  const all = await buildCards();
  const term = (search || '').toLowerCase();
  const searched = term ? all.filter((a) => `${a.name} ${a.email} ${a.phone} ${a.organization}`.toLowerCase().includes(term)) : all;
  const matched = status === 'all' ? searched : searched.filter((a) => a.status === status);
  const countOf = (key) => (key === 'all' ? all.length : all.filter((a) => a.status === key).length);
  return {
    results: matched.slice((page - 1) * limit, page * limit),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(matched.length / limit)),
    totalResults: matched.length,
    filters: AUDITOR_STATUS_FILTERS.map((f) => ({ ...f, count: countOf(f.key) })),
    statistics: {
      auditors: all.length,
      assigned: countOf('assigned'),
      assignments: all.reduce((n, a) => n + a.progress.assignments, 0),
      completed: all.reduce((n, a) => n + a.progress.completed, 0),
      disabled: countOf('disabled'),
    },
  };
};

// Add an auditor (Users → Auditors → Add). Auditors never sign up themselves.
const createAuditor = async ({ name, email, password }, actor) => {
  const user = await userService.createUser({ name, email, password, role: ROLES.AUDITOR }, actor);
  return { auditor: auditorView(plain(user)) };
};

const updateAuditor = async (userId, updates, actor) => {
  await findAuditor(userId);
  const user = await userService.updateUser(userId, updates, actor);
  return { auditor: auditorView(plain(user)) };
};

const setAuditorStatus = async (userId, status, actor) => {
  await findAuditor(userId);
  const user = await userService.updateUser(userId, { status }, actor);
  return { auditor: auditorView(plain(user)) };
};

// Soft delete. Their students are released (no auditor) so they can be assigned to someone else;
// completed audits stay on the students' results.
const deleteAuditor = async (userId, actor) => {
  await findAuditor(userId);
  await userService.deleteUser(userId, actor);
  await AuditAssignment.deleteMany({ auditor: userId });
};

// Assign students form. Always: every active department that has allocated students, with how
// many are assigned to this auditor. With ?dept=: that department's allocated students and who
// audits each one now.
const getAssignments = async (userId, { dept } = {}) => {
  const auditor = await findAuditor(userId);
  const studentIds = await User.find(LISTED_STUDENT).distinct('_id');
  const [departments, allocated, mine] = await Promise.all([
    Department.find({ isActive: true }).select('name icon group order').sort({ order: 1, _id: 1 }).lean(),
    Allocation.aggregate([{ $match: { student: { $in: studentIds } } }, { $group: { _id: '$dept', n: { $sum: 1 } } }]),
    AuditAssignment.aggregate([{ $match: { auditor: auditor._id } }, { $group: { _id: '$dept', n: { $sum: 1 } } }]),
  ]);
  const allocatedIn = new Map(allocated.map((x) => [x._id, x.n]));
  const mineIn = new Map(mine.map((x) => [x._id, x.n]));
  const out = {
    auditor: auditorView(auditor),
    departments: departments
      .filter((d) => allocatedIn.get(d._id))
      .map((d) => ({ key: d._id, name: d.name, icon: d.icon, group: d.group, allocated: allocatedIn.get(d._id), mine: mineIn.get(d._id) || 0 })),
    dept: dept || null,
    students: [],
  };
  if (!dept) return out;

  const allocations = await Allocation.find({ dept, student: { $in: studentIds } }).select('student').lean();
  const ids = allocations.map((a) => a.student);
  const [students, assignments] = await Promise.all([
    User.find({ _id: { $in: ids } }).select('name email studentId status').sort({ name: 1, _id: 1 }).lean(),
    AuditAssignment.find({ dept, student: { $in: ids } }).select('student auditor').populate('auditor', 'name email').lean(),
  ]);
  const auditorOf = new Map(assignments.map((x) => [String(x.student), x.auditor]));
  out.students = students.map((s) => {
    const a = auditorOf.get(String(s._id));
    return {
      uid: String(s._id),
      id: s.studentId || String(s._id),
      name: s.name || s.email,
      email: s.email,
      accountStatus: s.status === USER_STATUS.DISABLED ? USER_STATUS.DISABLED : USER_STATUS.ACTIVE,
      auditor: a ? { uid: String(a._id), name: a.name || a.email } : null,
      mine: Boolean(a && String(a._id) === String(auditor._id)),
    };
  });
  return out;
};

// Replace this auditor's students in one department. Students picked here move to this auditor
// (from whoever audited them before); this auditor's students left out are released.
const setAssignments = async (userId, { dept, students }, actor) => {
  const auditor = await findAuditor(userId);
  const department = await Department.findById(dept).select('name').lean();
  if (!department) throw fieldError('dept', `Department ${dept} not found`);
  const unique = [...new Set(students.map(String))];
  const allocated = await Allocation.find({ dept, student: { $in: unique } }).distinct('student');
  const valid = await User.find({ _id: { $in: allocated }, ...LISTED_STUDENT }).distinct('_id');
  if (valid.length !== unique.length) throw fieldError('students', `Some students are not allocated to ${department.name}`);

  await AuditAssignment.bulkWrite(
    [
      { deleteMany: { filter: { auditor: auditor._id, dept, student: { $nin: valid } } } },
      ...valid.map((student) => ({
        updateOne: { filter: { student, dept }, update: { $set: { auditor: auditor._id, assignedBy: actor._id } }, upsert: true },
      })),
    ],
    { ordered: true }
  );
  return { auditor: auditorView(auditor), dept, deptName: department.name, students: valid.length };
};

module.exports = { queryAuditors, createAuditor, updateAuditor, setAuditorStatus, deleteAuditor, getAssignments, setAssignments };

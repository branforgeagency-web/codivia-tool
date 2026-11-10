const { User } = require('../models');
const { USER_STATUS } = require('../config/userStatus');
const { ROLES } = require('../config/roles');
const { STUDENT_ID, formatStudentId } = require('../config/students');
const tokenService = require('./token.service');
const counterService = require('./counter.service');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const fieldError = (status, field, message) => new ApiError(status, message, [{ field, message }]);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const emailTaken = () => fieldError(httpStatus.CONFLICT, 'email', 'A user with this email already exists');

const LIVE = { deletedAt: null };

// Two saves with the same email at once: the unique index stops the second one.
const saveOrEmailTaken = async (save) => {
  try {
    return await save();
  } catch (err) {
    if (err.code === 11000) throw emailTaken();
    throw err;
  }
};

const getUserById = (id) => User.findOne({ _id: id, ...LIVE });

const getUserByEmailWithPassword = (email) => User.findOne({ email: email.trim().toLowerCase(), ...LIVE }).select('+password');

const findLiveUser = async (id) => {
  const user = await getUserById(id);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  return user;
};

const nextStudentId = async () => formatStudentId(await counterService.nextSequence(STUDENT_ID.counter));

// actor is null for self sign-up.
const createUser = async (body, actor = null) => {
  if (await User.isEmailTaken(body.email)) throw emailTaken();
  const role = body.role || ROLES.STUDENT;
  const studentId = role === ROLES.STUDENT ? await nextStudentId() : null;
  return saveOrEmailTaken(() => User.create({ ...body, role, studentId, createdBy: actor?._id ?? null }));
};

const queryUsers = async ({ search, role, status, sortBy = 'name', order = 'asc', page = 1, limit = 20 }) => {
  const filter = { ...LIVE };
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const [results, totalResults] = await Promise.all([
    User.find(filter)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  return { results, page, limit, totalPages: Math.max(1, Math.ceil(totalResults / limit)), totalResults };
};

const getUser = (id) => findLiveUser(id);

const updateUser = async (id, updates, actor) => {
  const user = await findLiveUser(id);
  const isSelf = actor._id.equals(user._id);
  if (isSelf && ((updates.role && updates.role !== user.role) || updates.status === USER_STATUS.DISABLED)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You can't change your own role or disable your own account");
  }
  if (updates.email && (await User.isEmailTaken(updates.email, user._id))) throw emailTaken();

  Object.assign(user, updates);
  // A user moved to the student role keeps an existing ID or gets a new one.
  if (user.role === ROLES.STUDENT && !user.studentId) user.studentId = await nextStudentId();
  const saved = await saveOrEmailTaken(() => user.save());

  // A new password or a disabled account ends every open session.
  if (updates.password || updates.status === USER_STATUS.DISABLED) await tokenService.revokeUserTokens(user._id);
  return saved;
};

// Soft delete.
const deleteUser = async (id, actor) => {
  const user = await findLiveUser(id);
  if (actor._id.equals(user._id)) throw new ApiError(httpStatus.BAD_REQUEST, "You can't delete your own account");
  user.deletedAt = new Date();
  user.deletedBy = actor._id;
  await user.save();
  await tokenService.revokeUserTokens(user._id);
};

module.exports = {
  getUserById,
  getUserByEmailWithPassword,
  createUser,
  queryUsers,
  getUser,
  updateUser,
  deleteUser,
};

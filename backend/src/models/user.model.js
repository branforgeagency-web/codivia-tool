const mongoose = require('mongoose');
const { ALL_ROLES, ROLES } = require('../config/roles');
const { ALL_USER_STATUSES, USER_STATUS } = require('../config/userStatus');
const { USER_LIMITS } = require('../config/users');
const { hashPassword, verifyPassword } = require('../utils/password');
const { toJSON } = require('./plugins');

const { ObjectId } = mongoose.Schema.Types;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: USER_LIMITS.name },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: USER_LIMITS.email },
    password: { type: String, required: true, select: false, private: true },
    role: { type: String, enum: ALL_ROLES, default: ROLES.STUDENT },
    studentId: { type: String, default: null }, // STU-00001, set for students only
    status: { type: String, enum: ALL_USER_STATUSES, default: USER_STATUS.ACTIVE },
    passwordChangedAt: { type: Date, default: null, private: true },
    lastLoginAt: { type: Date, default: null },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    // Soft delete: hidden, but old references stay readable.
    deletedAt: { type: Date, default: null, private: true },
    deletedBy: { type: ObjectId, ref: 'User', default: null, private: true },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
userSchema.index({ studentId: 1 }, { unique: true, partialFilterExpression: { studentId: { $type: 'string' } } });
userSchema.plugin(toJSON);

userSchema.pre('save', async function hashPasswordOnChange() {
  if (!this.isModified('password')) return;
  this.password = await hashPassword(this.password);
  // Back-dated 1s: JWT `iat` is in whole seconds, so tokens issued right after the change stay valid.
  this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.statics.isEmailTaken = async function isEmailTaken(email, excludeId) {
  const filter = { email: email.trim().toLowerCase(), deletedAt: null };
  if (excludeId) filter._id = { $ne: excludeId };
  return Boolean(await this.exists(filter));
};

userSchema.methods.isActive = function isActive() {
  return this.status === USER_STATUS.ACTIVE && !this.deletedAt;
};

// Needs the password field loaded: User.findOne(...).select('+password')
userSchema.methods.isPasswordMatch = function isPasswordMatch(password) {
  return verifyPassword(password, this.password);
};

module.exports = mongoose.model('User', userSchema);

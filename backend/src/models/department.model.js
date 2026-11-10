const mongoose = require('mongoose');
const {
  ALL_DEPARTMENT_GROUPS,
  CODE_ELEMENT_KEYS,
  DEPARTMENT_KEY_PATTERN,
  DEPARTMENT_LIMITS,
} = require('../config/departments');
const { toJSON } = require('./plugins');

const { ObjectId } = mongoose.Schema.Types;

// _id is the department key (e.g. "CARDIO"), the same key charts use in their `dept` field,
// so toJSON exposes it as `id`. The chart count is not stored: the service counts charts.
const departmentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true, uppercase: true, trim: true, match: DEPARTMENT_KEY_PATTERN },
    name: { type: String, required: true, trim: true, maxlength: DEPARTMENT_LIMITS.name },
    icon: { type: String, trim: true, default: '', maxlength: DEPARTMENT_LIMITS.icon },
    group: { type: String, enum: ALL_DEPARTMENT_GROUPS, required: true },
    elements: {
      type: [{ type: String, enum: CODE_ELEMENT_KEYS }],
      validate: [(v) => v.length > 0, 'elements must have at least one code set'],
    },
    order: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    updatedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

departmentSchema.index({ order: 1 });
departmentSchema.plugin(toJSON);

module.exports = mongoose.model('Department', departmentSchema);

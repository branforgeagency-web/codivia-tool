const mongoose = require('mongoose');
const { ASSIGNABLE_ROLES } = require('../config/roles');
const { MODULE_KEYS } = require('../config/modules');
const { toJSON } = require('./plugins');

const { ObjectId } = mongoose.Schema.Types;

// Stores only overrides of the defaults in config/access.js. No row → default applies.
const rolePermissionSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ASSIGNABLE_ROLES, required: true },
    module: { type: String, enum: MODULE_KEYS, required: true },
    view: { type: Boolean, default: false },
    add: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    updatedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

rolePermissionSchema.index({ role: 1, module: 1 }, { unique: true });
rolePermissionSchema.plugin(toJSON);

module.exports = mongoose.model('RolePermission', rolePermissionSchema);

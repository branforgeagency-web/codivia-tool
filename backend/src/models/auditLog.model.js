const mongoose = require('mongoose');
const { AUDIT_ACTION_KEYS, AUDIT_CATEGORY_KEYS } = require('../config/auditLog');
const { toJSON } = require('./plugins');

const { ObjectId, Mixed } = mongoose.Schema.Types;

// One admin change: who, what, to what, when. Names are copied in at write time so the entry still
// reads correctly after the student / chart / admin is renamed or deleted. Never edited afterwards.
const auditLogSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true, default: Date.now },
    actor: { type: ObjectId, ref: 'User', required: true },
    actorName: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    action: { type: String, enum: AUDIT_ACTION_KEYS, required: true },
    category: { type: String, enum: AUDIT_CATEGORY_KEYS, required: true },
    target: {
      type: { type: String, default: '' }, // student, chart, upload, department, work, students
      id: { type: String, default: '' },
      label: { type: String, default: '' },
    },
    summary: { type: String, default: '' },
    details: { type: Mixed, default: null },
  },
  { versionKey: false }
);

auditLogSchema.index({ at: -1, _id: -1 });
auditLogSchema.index({ category: 1, at: -1 });
auditLogSchema.index({ actor: 1, at: -1 });
auditLogSchema.index({ 'target.id': 1, at: -1 });
auditLogSchema.plugin(toJSON);

module.exports = mongoose.model('AuditLog', auditLogSchema);

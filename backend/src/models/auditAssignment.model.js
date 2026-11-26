const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const { ObjectId } = mongoose.Schema.Types;

// Which auditor reviews one student's charts in one department. One auditor per (student, dept);
// assigning another auditor moves the student. Set by an admin (Users → Auditors → Assign students).
const auditAssignmentSchema = new mongoose.Schema(
  {
    auditor: { type: ObjectId, ref: 'User', required: true },
    student: { type: ObjectId, ref: 'User', required: true },
    dept: { type: String, required: true },
    assignedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

auditAssignmentSchema.index({ student: 1, dept: 1 }, { unique: true });
auditAssignmentSchema.index({ auditor: 1, dept: 1 });
auditAssignmentSchema.plugin(toJSON);

module.exports = mongoose.model('AuditAssignment', auditAssignmentSchema);

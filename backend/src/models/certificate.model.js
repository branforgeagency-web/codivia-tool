const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const { ObjectId } = mongoose.Schema.Types;

// Issued automatically when a student completes enough charts in a department; one per
// (student, department). Everything printed on it is a snapshot from the moment it was issued,
// so it never changes as the student keeps working. `worked` and `avg` match the frontend's stats.
const certificateSchema = new mongoose.Schema(
  {
    certificateNo: { type: String, required: true }, // CDV-2026-7F3K9QXM
    student: { type: ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    studentCode: { type: String, default: null }, // STU-00001
    dept: { type: String, required: true },
    deptName: { type: String, required: true },
    elements: { type: [String], default: [] }, // code sets printed on the certificate
    worked: { type: Number, required: true, min: 0 },
    avg: { type: Number, required: true, min: 0, max: 100 },
    issuedAt: { type: Date, required: true },
  },
  { versionKey: false }
);

certificateSchema.index({ certificateNo: 1 }, { unique: true });
certificateSchema.index({ student: 1, dept: 1 }, { unique: true });
certificateSchema.index({ issuedAt: -1 });
certificateSchema.plugin(toJSON);

module.exports = mongoose.model('Certificate', certificateSchema);

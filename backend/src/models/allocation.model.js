const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const { ObjectId } = mongoose.Schema.Types;

// The range of a department's charts assigned to a student: charts `start`..`end` (1-based,
// inclusive, by chart `position`). One document per (student, department). Same as the frontend's
// allocation range; a legacy allocation of N charts is { start: 1, end: N }.
const allocationSchema = new mongoose.Schema(
  {
    student: { type: ObjectId, ref: 'User', required: true },
    dept: { type: String, required: true, uppercase: true, trim: true },
    start: { type: Number, required: true, min: 1 },
    end: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

allocationSchema.index({ student: 1, dept: 1 }, { unique: true });
allocationSchema.index({ dept: 1 });
allocationSchema.plugin(toJSON);

module.exports = mongoose.model('Allocation', allocationSchema);

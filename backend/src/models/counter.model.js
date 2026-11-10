const mongoose = require('mongoose');

// Named sequences (e.g. 'students' → next Student ID number). _id is the sequence name.
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

module.exports = mongoose.model('Counter', counterSchema);

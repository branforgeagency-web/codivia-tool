const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

// Tabular List notes for one ICD-10-CM category or code. _id is the code as printed (e.g. "J45.2").
// Only the kinds the book has for that code are stored; each is a list of lines.
const lines = { type: [String], default: undefined };

const icdNoteSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    inc: lines, // Includes
    ex1: lines, // Excludes1
    ex2: lines, // Excludes2
    use: lines, // Use additional code
    first: lines, // Code first
    also: lines, // Code also
    note: lines,
  },
  { versionKey: false }
);

icdNoteSchema.plugin(toJSON);

module.exports = mongoose.model('IcdNote', icdNoteSchema);

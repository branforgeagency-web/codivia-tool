const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

// The counties in one Medicare payment locality (<yy>LOCCO.csv).
// _id is "<release>:<mac>:<locality>".
const feeLocalitySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    release: { type: String, required: true },
    mac: { type: String, required: true },
    locality: { type: String, required: true },
    state: { type: String, required: true }, // carried down from the row above when CMS leaves it blank
    area: { type: String, required: true }, // fee schedule area
    counties: { type: String, required: true },
    seq: { type: Number, required: true, min: 0, private: true },
  },
  { versionKey: false, collection: 'feelocalities' }
);

feeLocalitySchema.index({ release: 1, mac: 1, locality: 1 }, { unique: true });
feeLocalitySchema.index({ release: 1, seq: 1 });
feeLocalitySchema.plugin(toJSON);

module.exports = mongoose.model('FeeLocality', feeLocalitySchema);

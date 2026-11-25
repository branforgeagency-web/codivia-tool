const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

// Anesthesia conversion factors of one payment locality (ANES<year>.csv).
// _id is "<release>:<contractor>:<locality>".
const feeAnesthesiaSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    release: { type: String, required: true },
    contractor: { type: String, required: true },
    locality: { type: String, required: true },
    name: { type: String, required: true },
    qppConversionFactor: { type: Number, required: true },
    nonQppConversionFactor: { type: Number, required: true },
    seq: { type: Number, required: true, min: 0, private: true },
  },
  { versionKey: false, collection: 'feeanesthesia' }
);

feeAnesthesiaSchema.index({ release: 1, contractor: 1, locality: 1 }, { unique: true });
feeAnesthesiaSchema.index({ release: 1, seq: 1 });
feeAnesthesiaSchema.plugin(toJSON);

module.exports = mongoose.model('FeeAnesthesia', feeAnesthesiaSchema);

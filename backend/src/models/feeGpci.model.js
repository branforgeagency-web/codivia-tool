const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

// Geographic practice cost indices of one Medicare payment locality (GPCI<year>.csv).
// _id is "<release>:<mac>:<locality>".
const feeGpciSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    release: { type: String, required: true },
    mac: { type: String, required: true }, // Medicare Administrative Contractor number
    state: { type: String, required: true },
    locality: { type: String, required: true },
    name: { type: String, required: true },
    pwGpci: { type: Number, required: true }, // work GPCI (as paid, with the floor)
    pwGpciWithoutFloor: { type: Number }, // only in releases that print it
    peGpci: { type: Number, required: true },
    mpGpci: { type: Number, required: true },
    seq: { type: Number, required: true, min: 0, private: true },
  },
  { versionKey: false, collection: 'feegpcis' }
);

feeGpciSchema.index({ release: 1, mac: 1, locality: 1 }, { unique: true });
feeGpciSchema.index({ release: 1, seq: 1 });
feeGpciSchema.plugin(toJSON);

module.exports = mongoose.model('FeeGpci', feeGpciSchema);

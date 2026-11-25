const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

// OPPS payment cap of one code in one locality (OPPSCAP_<month>.csv): the PFS pays the lower of the
// fee-schedule amount and this cap for certain imaging / diagnostic codes.
// _id is "<release>:<hcpcs>:<mod>:<carrier>:<locality>".
const feeOppsCapSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    release: { type: String, required: true },
    hcpcs: { type: String, required: true },
    mod: { type: String, default: '' },
    procStatus: { type: String, default: '' },
    carrier: { type: String, required: true },
    locality: { type: String, required: true },
    facilityPrice: { type: Number, required: true },
    nonFacilityPrice: { type: Number, required: true },
    seq: { type: Number, required: true, min: 0, private: true },
  },
  { versionKey: false, collection: 'feeoppscaps' }
);

feeOppsCapSchema.index({ release: 1, hcpcs: 1, mod: 1, carrier: 1, locality: 1 }, { unique: true });
feeOppsCapSchema.index({ release: 1, seq: 1 });
feeOppsCapSchema.plugin(toJSON);

module.exports = mongoose.model('FeeOppsCap', feeOppsCapSchema);

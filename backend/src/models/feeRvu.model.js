const mongoose = require('mongoose');
const { RVU_VARIANT_LIST } = require('../config/fees');
const { toJSON } = require('./plugins');

// One row of a PFS Relative Value File (PPRRVU<year>_<month>_nonQPP.csv / _QPP.csv): the relative
// value units and payment-policy indicators of one HCPCS / CPT code (+ modifier 26 / TC / 53).
// _id is "<release>:<variant>:<hcpcs>:<mod>" (mod "" for the global service), e.g. "RVU26C:nonQPP:99214:".
// Price = total RVU × conversion factor (non-facility total for office settings, facility total in a facility).
const num = { type: Number, required: true };
const feeRvuSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    release: { type: String, required: true },
    variant: { type: String, enum: RVU_VARIANT_LIST, required: true },
    hcpcs: { type: String, required: true },
    mod: { type: String, default: '' },
    description: { type: String, default: '' },
    status: { type: String, required: true }, // PFS status code (A, B, C, E, I, R, T …)
    notUsedForMedicare: { type: String, default: '' },
    workRvu: num,
    nonFacilityPeRvu: num,
    nonFacilityNa: { type: Boolean, required: true }, // "NA": not paid in a non-facility setting
    facilityPeRvu: num,
    facilityNa: { type: Boolean, required: true },
    mpRvu: num,
    nonFacilityTotal: num,
    facilityTotal: num,
    pctcInd: { type: String, default: '' },
    globalDays: { type: String, default: '' }, // 000, 010, 090, XXX, ZZZ, YYY, MMM
    preOp: num,
    intraOp: num,
    postOp: num,
    multProc: { type: String, default: '' }, // multiple-procedure rule (2 = standard 100% / 50% reduction)
    bilatSurg: { type: String, default: '' },
    asstSurg: { type: String, default: '' },
    coSurg: { type: String, default: '' },
    teamSurg: { type: String, default: '' },
    pricInd: { type: String, default: '' },
    endoBase: { type: String, default: '' },
    conversionFactor: num,
    physicianSupervision: { type: String, default: '' },
    calculationFlag: { type: String, default: '' },
    imagingFamily: { type: String, default: '' },
    oppsNonFacilityPe: num,
    oppsFacilityPe: num,
    oppsMp: num,
    seq: { type: Number, required: true, min: 0, private: true }, // source row order
  },
  { versionKey: false, collection: 'feervus' }
);

feeRvuSchema.index({ release: 1, variant: 1, hcpcs: 1, mod: 1 }, { unique: true });
feeRvuSchema.index({ release: 1, variant: 1, seq: 1 });
feeRvuSchema.plugin(toJSON);

module.exports = mongoose.model('FeeRvu', feeRvuSchema);

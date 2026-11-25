// Medicare Physician Fee Schedule lookups (data loaded by `npm run seed:fees`).
// Prices come from the active release: total RVU × conversion factor (non-QPP, national — no GPCI).
const { FeeRelease, FeeRvu } = require('../models');
const { RVU_VARIANTS, PFS_STATUS, PRICED_STATUSES } = require('../config/fees');

const money = (n) => Math.round(n * 100) / 100;

const releaseSummary = (r) =>
  r && {
    id: r._id,
    title: r.title,
    releasedOn: r.releasedOn,
    conversionFactor: r.conversionFactor.nonQpp,
  };

const getActiveRelease = () => FeeRelease.findOne({ active: true }).lean();

// Every loaded release (newest first), with the files it was loaded from.
const listReleases = async () => {
  const rows = await FeeRelease.find().sort({ year: -1, letter: -1 }).lean();
  return {
    results: rows.map((r) => ({
      ...releaseSummary(r),
      qppConversionFactor: r.conversionFactor.qpp,
      anesthesiaConversionFactor: r.anesthesiaConversionFactor,
      active: !!r.active,
      files: r.files,
      missing: r.missing,
      loadedAt: r.loadedAt,
    })),
  };
};

// codes: normalised CPT / HCPCS codes. Returns { release, codes: { code: info | null } } where null means
// the code is not on the fee schedule. With no fee data loaded, release is null (the app shows "not available").
const getRvus = async (codes) => {
  const release = await getActiveRelease();
  const out = Object.fromEntries(codes.map((c) => [c, null]));
  if (!release) return { release: null, codes: out };
  const cf = release.conversionFactor.nonQpp;
  // The global service (no modifier) of each code.
  const rows = await FeeRvu.find({ release: release._id, variant: RVU_VARIANTS.NON_QPP, hcpcs: { $in: codes }, mod: '' }).lean();
  rows.forEach((r) => {
    const priced = PRICED_STATUSES.includes(r.status) && (r.nonFacilityTotal > 0 || r.facilityTotal > 0);
    out[r.hcpcs] = {
      code: r.hcpcs,
      description: r.description,
      status: r.status,
      statusLabel: PFS_STATUS[r.status] || `Status ${r.status}`,
      priced,
      rvu: { work: r.workRvu, nonFacility: r.nonFacilityTotal, facility: r.facilityTotal },
      price: priced ? { nonFacility: money(r.nonFacilityTotal * cf), facility: money(r.facilityTotal * cf) } : null,
      nonFacilityNa: r.nonFacilityNa,
      facilityNa: r.facilityNa,
      multProc: r.multProc,
      globalDays: r.globalDays,
    };
  });
  return { release: releaseSummary(release), codes: out };
};

module.exports = { getActiveRelease, listReleases, getRvus };

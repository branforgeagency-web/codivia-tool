// Medicare Physician Fee Schedule (PFS) reference data — CMS "PFS Relative Value Files".
// Loaded by `npm run seed:fees` from backend/src/data/RVU<yy><letter>/ (one folder per CMS release,
// e.g. RVU26A = January, RVU26B = April, RVU26C = July). Separate from the code DB (`codes`).
const path = require('path');

const FEE_DATA_DIR = path.resolve(__dirname, '../data');
// A release folder: RVU + 2-digit year + release letter (A, B, C, D …).
const RELEASE_DIR = /^RVU(\d{2})([A-Z])$/;

// The CMS files in a release folder (CSV versions; the .txt / .xlsx copies are not read).
// kind -> file name pattern
const FEE_FILE_KINDS = Object.freeze({
  rvu: /^PPRRVU\d{4}_[A-Za-z]+_nonQPP\.csv$/i, // RVUs, non-qualifying APM conversion factor (the usual one)
  rvuQpp: /^PPRRVU\d{4}_[A-Za-z]+_QPP\.csv$/i, // RVUs, qualifying APM participants
  gpci: /^GPCI\d{4}\.csv$/i, // geographic practice cost indices by locality
  locality: /^\d{2}LOCCO\.csv$/i, // counties in each payment locality
  anesthesia: /^ANES\d{4}\.csv$/i, // anesthesia conversion factor by locality
  oppsCap: /^OPPSCAP_[A-Za-z]+\.csv$/i, // OPPS payment caps by code and locality
});
const FEE_KIND_LIST = Object.freeze(Object.keys(FEE_FILE_KINDS));
// A release must have these; the others are loaded when present (or copied from an earlier
// release of the same year, see the loader).
const REQUIRED_KINDS = Object.freeze(['rvu']);

const RVU_VARIANTS = Object.freeze({ NON_QPP: 'nonQPP', QPP: 'QPP' });
const RVU_VARIANT_LIST = Object.freeze(Object.values(RVU_VARIANTS));

// PFS status codes (column "STATUS CODE").
const PFS_STATUS = Object.freeze({
  A: 'Active — paid under the fee schedule',
  B: 'Bundled — payment is included in another service',
  C: 'Carrier priced',
  D: 'Deleted code',
  E: 'Excluded from the fee schedule by regulation',
  F: 'Deleted / discontinued code',
  G: 'Not valid for Medicare — use another code',
  H: 'Deleted modifier',
  I: 'Not valid for Medicare — use another code',
  J: 'Anesthesia service',
  M: 'Measurement code — not paid',
  N: 'Non-covered service',
  P: 'Bundled or excluded',
  R: 'Restricted coverage',
  T: 'Injection — paid only when no other service is paid',
  X: 'Statutory exclusion — not covered',
});
// Statuses whose RVUs give a fee-schedule price.
const PRICED_STATUSES = Object.freeze(['A', 'R', 'T']);

// Place-of-service codes paid at the facility rate (hospital / facility settings); everything else
// (office POS 11 …) is paid at the non-facility rate.
const FACILITY_POS = Object.freeze(['19', '21', '22', '23', '24', '26', '31', '34', '51', '52', '56', '61']);

const FEE_LIMITS = Object.freeze({ codesMax: 50 });

module.exports = {
  FEE_DATA_DIR,
  RELEASE_DIR,
  FEE_FILE_KINDS,
  FEE_KIND_LIST,
  REQUIRED_KINDS,
  RVU_VARIANTS,
  RVU_VARIANT_LIST,
  PFS_STATUS,
  PRICED_STATUSES,
  FACILITY_POS,
  FEE_LIMITS,
};

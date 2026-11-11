// Charts a student must complete in one department to earn that department's certificate.
const CERT_THRESHOLD = 200;

// Certificate numbers are random, not sequential: the public verify endpoint takes one,
// so they must not be guessable. No 0/O/1/I/L, to avoid misreading.
const CERT_NUMBER = Object.freeze({ prefix: 'CDV', length: 8, alphabet: '23456789ABCDEFGHJKMNPQRSTUVWXYZ' });
const CERT_NUMBER_PATTERN = /^CDV-\d{4}-[2-9A-HJKMNP-Z]{8}$/;

const CERT_SORT_FIELDS = Object.freeze(['issuedAt', 'dept', 'avg']);

// Submitted coding sheet limits.
const RESULT_LIMITS = Object.freeze({ rows: 200, code: 30, desc: 500, mod: 10, poa: 5, drg: 300 });
const CHART_ID_PATTERN = /^[A-Z0-9_]+-[0-9]+$/;

module.exports = { CERT_THRESHOLD, CERT_NUMBER, CERT_NUMBER_PATTERN, CERT_SORT_FIELDS, RESULT_LIMITS, CHART_ID_PATTERN };

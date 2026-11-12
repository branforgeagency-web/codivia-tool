// Admin Upload page: charts uploaded by admins.
const CHART_UPLOAD = Object.freeze({
  counter: 'chartUploads', // Counter document that numbers published uploads
  idBase: 900000, // published IDs are DEPT-900001, DEPT-900002…, clear of built-in DEPT-0001…
});

const UPLOAD_LIMITS = Object.freeze({
  fileBytes: 10 * 1024 * 1024,
  pdfPages: 300,
  title: 200,
  record: 200000, // characters of extracted record text
  rows: 100, // answer key rows
  code: 30,
  type: 10,
  desc: 500,
  why: 2000,
  patientName: 100,
  sourceName: 255,
});

module.exports = { CHART_UPLOAD, UPLOAD_LIMITS };

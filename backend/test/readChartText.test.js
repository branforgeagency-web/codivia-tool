const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readChartText } = require('../src/utils/readChartText');

const departments = [
  { id: 'EM', name: 'E/M Clinic' },
  { id: 'GENSURG', name: 'General Surgery' },
];

const FILE = `===== CHART SETUP =====
Department: General Surgery
Title: Laparoscopic cholecystectomy for acute cholecystitis
Encounter Type: Inpatient
Billing Type: Hospital facility
Work Type: Code
Difficulty: Hard
===== CHART =====
Patient: Rivera, Ana
Sex: Female
Age: 52 years
MRN: M0048213
Account #: V00981234
Admit Date: 03/02/2026
Discharge Date: 03/05/2026
Provider: Dr Kim Patel, MD (General Surgery)
Payer: Medicare
Allergies:
NKDA

CHIEF COMPLAINT:
Right upper quadrant pain.
===== ANSWER KEY =====
PDx | K80.00 | Calculus of gallbladder with acute cholecystitis | Op note confirms stones | POA: Y
SDx | I10 | Essential hypertension | Listed in PMH | POA: Y
PCS | 0FT44ZZ | Resection of gallbladder, perc endo | Laparoscopic removal
NOT REPORTED | R10.11 | Symptom of the confirmed cholecystitis
Discharge Disposition: 01 Home
`;

test('reads setup, patient, encounter and answer key; record keeps only the chart', () => {
  const { record, fields, found } = readChartText(FILE, { departments });
  assert.equal(fields.dept, 'GENSURG');
  assert.equal(fields.title, 'Laparoscopic cholecystectomy for acute cholecystitis');
  assert.equal(fields.encounterType, 'IP');
  assert.equal(fields.billingType, 'facility');
  assert.equal(fields.difficulty, 'advanced');
  assert.deepEqual(fields.patient, { name: 'Rivera, Ana', sex: 'F', age: '52' });
  assert.equal(fields.encounter.mrn, 'M0048213');
  assert.equal(fields.encounter.provider, 'Dr Kim Patel, MD');
  assert.equal(fields.encounter.specialty, 'General Surgery');
  assert.equal(fields.encounter.allergy, 'NKDA');
  assert.equal(fields.encounter.los, 3);
  assert.equal(fields.answerKey.length, 3);
  assert.deepEqual(fields.answerKey[0], { type: 'PDx', code: 'K80.00', desc: 'Calculus of gallbladder with acute cholecystitis', why: 'Op note confirms stones', poa: 'Y' });
  assert.equal(fields.keyMeta.extraWhy['R10.11'], 'Symptom of the confirmed cholecystitis');
  assert.equal(fields.keyMeta.disp, '01 Home');
  assert.ok(record.startsWith('Patient: Rivera, Ana'));
  assert.ok(!/ANSWER KEY|K80\.00|Difficulty/.test(record));
  assert.ok(found.includes('Answer key (3 codes)'));
});

test('a plain chart without markers: whole text is the record, OP guessed, setup lines removed', () => {
  const { record, fields } = readChartText('Work Type: Charge review\nPatient: Lee, Sam\nSex: M\nDate of Service: 01/10/2026\n\nHPI:\nCough.', { departments });
  assert.equal(fields.encounterType, 'OP');
  assert.equal(fields.billingType, '');
  assert.equal(fields.workType, 'review');
  assert.equal(fields.patient.sex, 'M');
  assert.equal(fields.encounter.dos, '01/10/2026');
  assert.ok(!record.includes('Work Type'));
  assert.ok(record.includes('HPI:'));
});

test('reads original coding and denial blocks', () => {
  const text = `Patient: X, Y
===== ORIGINAL CODING =====
DX | J18.9 | Y
LINE | 99214 | 25 | 1 | A | CO-97 | 180.00
Entered By: Dr Lee
===== DENIAL =====
Claim #: INV-1001
Billed: $180.00
Days to Appeal: 45
HISTORY | 01/12/2026 | Denied | CO-97 bundled | 180.00`;
  const { fields } = readChartText(text, { departments });
  assert.deepEqual(fields.original.dx, [{ code: 'J18.9', poa: 'Y' }]);
  assert.deepEqual(fields.original.lines[0], { code: '99214', mods: ['25'], units: 1, ptrs: ['A'], remit: 'CO-97', billed: 180 });
  assert.equal(fields.original.enteredBy, 'Dr Lee');
  assert.equal(fields.denial.invoice.num, 'INV-1001');
  assert.equal(fields.denial.invoice.billed, 180);
  assert.equal(fields.denial.invoice.daysToAppeal, 45);
  assert.deepEqual(fields.denial.history, [['01/12/2026', 'Denied', 'CO-97 bundled', '180.00']]);
});

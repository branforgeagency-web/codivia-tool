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
  assert.deepEqual(fields.patient, { name: 'Rivera, Ana', sex: 'F', age: '52', details: {} });
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

test('reads demographic details (DOB, address, language, employer, code status)', () => {
  const { fields, record } = readChartText('Patient: Doe, Jane\nDOB: 11/29/1980\nAddress: 12 Elm St, Springfield\nPreferred Language: English\nEmployer: Acme\nCode Status: Full Code\n\nHPI:\nCough.', { departments });
  assert.deepEqual(fields.patient.details, { dob: '11/29/1980', address: '12 Elm St, Springfield', language: 'English', employer: 'Acme', codeStatus: 'Full Code' });
  assert.ok(record.includes('DOB: 11/29/1980'));
});

test('reads earlier visits and episodes of care, and links visits to episodes by name', () => {
  const text = `===== CHART =====
Patient: Doe, Jane
Date of Service: 03/10/2026
Episode: Right knee replacement
HPI:
Post-op check.
===== PREVIOUS RECORD =====
Title: Total knee arthroplasty, right
Date of Service: 02/01/2026
Provider: Dr Ortho
Episode: Right knee replacement
CPT | 27447 | Total knee arthroplasty
PDx | M17.11 | Primary osteoarthritis, right knee
Operative note: uncomplicated TKA.
===== PREVIOUS VISIT =====
Title: Annual exam
Date of Service: 01/05/2025
Routine exam.
===== EPISODE =====
Name: Right knee replacement
Type: Surgical
Status: open
Start: 02/01/2026
Diagnosis: M17.11 Primary osteoarthritis, right knee`;
  const { fields, record, found } = readChartText(text, { departments });
  assert.equal(fields.encounter.episode, 'Right knee replacement');
  assert.equal(fields.previousRecords.length, 2);
  const [tka, exam] = fields.previousRecords;
  assert.equal(tka.episode, 'Right knee replacement');
  assert.deepEqual(tka.codes.map((c) => c.type + ' ' + c.code), ['CPT 27447', 'PDx M17.11']);
  assert.equal(tka.body, 'Operative note: uncomplicated TKA.');
  assert.equal(exam.episode, undefined);
  assert.deepEqual(fields.episodes, [{ key: 'ep1', name: 'Right knee replacement', status: 'Active', type: 'Surgical', start: '02/01/2026', dx: 'M17.11 Primary osteoarthritis, right knee' }]);
  assert.ok(!record.includes('27447'), 'earlier visits stay out of the record');
  assert.ok(found.includes('Earlier visits (2)') && found.includes('Episodes (1)'));
});

test('reads NOTE blocks as separate notes; the chart narrative becomes the first progress note', () => {
  const text = `===== CHART =====
Patient: Doe, Jane
Date of Service: 03/10/2026
Provider: Dr Kim, MD (Orthopedics)
HPI:
Right knee pain.
===== NOTE =====
Type: H&P
Title: Admission History and Physical
Author: Dr Lee, MD
Specialty: Hospitalist
Date: 03/09/2026
CHIEF COMPLAINT: Knee pain.
===== NOTE =====
Type: Operative Report
Status: Signed
PROCEDURE: Right total knee arthroplasty.
===== PREVIOUS RECORD =====
Title: Arthroscopy
Note Type: Operative Report
Scope of right knee.`;
  const { fields, record, found } = readChartText(text, { departments });
  const [lead, hp, op] = fields.documents;
  assert.equal(fields.documents.length, 3);
  assert.deepEqual(
    { key: lead.key, type: lead.type, author: lead.author, specialty: lead.specialty, body: lead.body },
    { key: 'n0', type: 'Progress Notes', author: 'Dr Kim, MD', specialty: 'Orthopedics', body: 'HPI:\nRight knee pain.' },
  );
  assert.deepEqual(
    { type: hp.type, title: hp.title, author: hp.author, specialty: hp.specialty, date: hp.date, sub: hp.sub, body: hp.body },
    { type: 'H&P', title: 'Admission History and Physical', author: 'Dr Lee, MD', specialty: 'Hospitalist', date: '03/09/2026', sub: '03/09/2026 · Dr Lee, MD', body: 'CHIEF COMPLAINT: Knee pain.' },
  );
  assert.equal(op.title, 'Operative Report');
  assert.equal(op.author, 'Dr Kim, MD');
  assert.equal(op.date, '03/10/2026');
  assert.equal(fields.previousRecords[0].noteType, 'Operative Report');
  assert.ok(record.includes('PROCEDURE: Right total knee arthroplasty.'));
  assert.ok(found.includes('Notes (3)'));
});

test('a chart without NOTE blocks has no documents (works as before)', () => {
  const { fields } = readChartText('Patient: Doe, Jane\nHPI:\nCough.', { departments });
  assert.equal(fields.documents, undefined);
});

test('a letter NOTE block keeps its recipient', () => {
  const { fields } = readChartText('Provider: Dr Kim\nDOS: 01/02/2026\n===== NOTE =====\nType: Letter\nTitle: Referral to cardiology\nTo: Dr Heart, Cardiology\nStatus: Sent\nDear Dr Heart, please see ...', { departments });
  const letter = fields.documents.find((d) => d.type === 'Letter');
  assert.equal(letter.recipient, 'Dr Heart, Cardiology');
  assert.equal(letter.status, 'Sent');
  assert.equal(letter.author, 'Dr Kim');
  assert.equal(letter.body, 'Dear Dr Heart, please see ...');
});

test('reads ED visit details for this visit and earlier visits', () => {
  const text = `Date of Service: 03/10/2026
Arrival: 03/10/2026 14:05
Departure: 03/10/2026 18:40
Acuity: 3
ED Disposition: Discharged home
HPI: chest pain
===== PREVIOUS RECORD =====
Title: ED visit - ankle injury
Date of Service: 01/02/2026
Arrival: 01/02/2026 09:10
ESI: 4
Disposition: Discharged home
Ankle sprain.`;
  const { fields } = readChartText(text, { departments });
  assert.deepEqual(
    [fields.encounter.arrival, fields.encounter.departure, fields.encounter.acuity, fields.encounter.disposition],
    ['03/10/2026 14:05', '03/10/2026 18:40', '3', 'Discharged home'],
  );
  const p = fields.previousRecords[0];
  assert.deepEqual([p.arrival, p.acuity, p.disposition], ['01/02/2026 09:10', '4', 'Discharged home']);
  assert.equal(p.body, 'Ankle sprain.');
});

test('reads structured labs, meds, orders, LDAs, procedures, anesthesia and media rows', () => {
  const text = `Date of Service: 03/10/2026
HPI: knee pain
LAB | Hemoglobin | 10.2 | g/dL | 12.0-16.0 | L | 03/10/2026 06:00 | Final
LAB | Potassium | 4.1 | mmol/L | 3.5-5.1 | | 03/10/2026 06:00 | Final
MED | Lisinopril | 10 mg | PO | Daily | Dr Kim | 01/01/2025 | Active
===== CLINICAL DATA =====
ORDER | Physical therapy evaluation | Rehab | Ordered | Dr Kim | 03/10/2026
LDA | Peripheral IV | Left forearm | 03/10/2026 07:00 | - | Active
PROC | Right total knee arthroplasty | 03/10/2026 | Dr Kim | Completed
ANES | General | ASA 2 | 07:42 | 09:17 | Dr Sleep | Right TKA
MEDIA | Signed consent form | Consent | 03/09/2026 | Registration`;
  const { fields, record, found } = readChartText(text, { departments });
  const c = fields.clinical;
  assert.equal(c.labs.length, 2);
  assert.deepEqual(c.labs[0], { test: 'Hemoglobin', value: '10.2', units: 'g/dL', range: '12.0-16.0', flag: 'L', collected: '03/10/2026 06:00', status: 'Final' });
  assert.equal(c.labs[1].flag, undefined);
  assert.deepEqual(c.meds[0], { name: 'Lisinopril', dose: '10 mg', route: 'PO', frequency: 'Daily', prescriber: 'Dr Kim', start: '01/01/2025', status: 'Active' });
  assert.equal(c.orders[0].type, 'Rehab');
  assert.deepEqual(c.ldas[0], { device: 'Peripheral IV', site: 'Left forearm', inserted: '03/10/2026 07:00', status: 'Active' });
  assert.equal(c.procedures[0].performedBy, 'Dr Kim');
  assert.deepEqual(c.anesthesia[0], { type: 'General', asa: 'ASA 2', start: '07:42', stop: '09:17', provider: 'Dr Sleep', procedure: 'Right TKA' });
  assert.equal(c.media[0].document, 'Signed consent form');
  assert.ok(!record.includes('LAB |') && record.includes('HPI: knee pain'));
  assert.ok(found.includes('Labs (2)') && found.includes('Anesthesia (1)'));
});

test('reads structured cardiology rows', () => {
  const { fields } = readChartText('CARD | EKG 12-lead | 03/10/2026 08:15 | Sinus tachycardia, no ST changes | HR 112; PR 150 ms; QTc 440 ms | Abnormal | Final | Dr Heart', { departments });
  assert.deepEqual(fields.clinical.cards[0], { study: 'EKG 12-lead', date: '03/10/2026 08:15', interpretation: 'Sinus tachycardia, no ST changes', measurements: 'HR 112; PR 150 ms; QTc 440 ms', flag: 'Abnormal', status: 'Final', readBy: 'Dr Heart' });
});

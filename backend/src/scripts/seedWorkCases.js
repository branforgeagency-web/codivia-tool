// DISCONNECTED (2026-11-17): no npm script runs this and the 4 sample charts were removed from the DB.
// Kept for reference only. Charts now come from admin upload; running it would re-insert the samples.
// Seeds the sample work-queue charts: a charge review and a denial (E/M), and an inpatient chart
// to code plus the same stay as a DRG validation (IP). All patients, payers and providers are made up.
//
// Students only see charts inside their allocated range (by position), so by default new sample
// charts are put at the FRONT of their department (positions 1..k) and the existing charts move
// down by k. Re-running only updates the samples in place.
//
// Usage:
//   npm run seed:work-cases              insert at the front (default)
//   npm run seed:work-cases -- --append  insert at the end of the department instead
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Chart } = require('../models');

const SHIFT = 1000000;

// ---------------------------------------------------------------- E/M: charge review
const sharonNote = `PROGRESS NOTE — OFFICE VISIT
MRN: Y712976   Account #: V39794453
Insurance: Aetna PPO
Facility: Northside Family Clinic
Date of Service: 09/23/2026
Provider: Anita Rao, MD (Family Medicine)
Patient type: Established patient

CHIEF COMPLAINT:
Facial pressure and nasal congestion for 12 days.

HISTORY OF PRESENT ILLNESS:
28-year-old female with facial pain over both cheeks, thick yellow nasal discharge and low-grade fever for 12 days. Symptoms improved on day 5 and then worsened again. This is her third sinus infection this year; last treated in June.

PAST MEDICAL HISTORY:
Recurrent sinusitis.
Mild intermittent asthma, well controlled on albuterol as needed.

REVIEW OF SYSTEMS:
Positive for nasal congestion, facial pain and fever. Negative for vision change, neck stiffness and shortness of breath.

EXAMINATION:
Vitals: BP 112/68, HR 91, RR 20, Temp 37.8 C, SpO2 98%.
HEENT: maxillary sinuses tender to palpation bilaterally. Nasal mucosa red and swollen with purulent discharge in the middle meatus. Posterior pharyngeal drainage. No periorbital swelling; eye movements intact.
Neck: supple. Lungs: clear, no wheeze.

PROCEDURE:
Ceftriaxone 1 g IM, left gluteal, given in clinic by RN at 10:40 (patient vomited oral amoxicillin-clavulanate this morning). Single-dose vial, no waste. Tolerated well.

ASSESSMENT & PLAN:
1. Acute recurrent maxillary sinusitis — ceftriaxone 1 g IM today, then doxycycline 100 mg twice daily for 7 days. Saline irrigation.
2. Fever — due to #1; acetaminophen as needed.
3. Mild intermittent asthma — stable; continue albuterol as needed.
MDM moderate: acute illness with systemic symptoms, prescription drug management. Total time 32 minutes.
Refer to ENT if another episode.`;

const sharonDocs = [
  { key: 'note', title: 'Progress Note', sub: '09/23/2026 · A. Rao, MD', body: sharonNote },
  {
    key: 'mar',
    title: 'Medication Administration (MAR)',
    sub: '09/23/2026 10:40 · RN',
    body: `MEDICATION ADMINISTRATION RECORD:
Ceftriaxone 1,000 mg IM, left gluteal, at 10:40. Lot 4471A. Single-dose vial, 0 mg wasted. Given by RN.

ACTIVE MEDICATIONS:
Doxycycline 100 mg tablet — 1 tablet twice daily x 7 days (new).
Albuterol HFA 90 mcg — 2 puffs every 4-6 h as needed (active).`,
  },
  {
    key: 'prior',
    title: 'Prior Visit — 06/12/2026',
    sub: 'Office visit · A. Rao, MD',
    body: `ASSESSMENT:
Acute maxillary sinusitis, 2nd episode this year. Amoxicillin-clavulanate x 10 days. Asthma stable.

PROBLEM LIST:
Recurrent sinusitis — active, noted 06/12/2026.
Mild intermittent asthma — active, noted 11/20/2025.
(The problem list is a guide only. Code from the note for this date of service.)`,
  },
  {
    key: 'coverage',
    title: 'Coverage & Payer Rules',
    sub: 'Aetna PPO · Open Access Choice',
    body: `COVERAGE:
Payer: Aetna PPO. Plan: Open Access Choice. Member ID: W221044719.
Patient status: established — last seen 06/12/2026.

PAYER BILLING NOTES:
E/M billed with a minor procedure on the same day needs modifier 25.
Drug codes are billed in the units of the HCPCS description (J0696 is per 250 mg).
Up to 4 diagnosis pointers per line; the first pointer is the main reason for that service.`,
  },
];

const EM_REVIEW = {
  _id: 'EM-7001',
  workType: 'review',
  difficulty: 'moderate',
  title: 'Charge review — recurrent maxillary sinusitis with IM injection',
  patient: { name: 'Sharon Iyer', sex: 'F', age: 28 },
  record: sharonNote,
  documents: sharonDocs,
  encounter: {
    mrn: 'Y712976', acct: 'V39794453', encounterId: 'E-882130', dos: '09/23/2026', provider: 'Anita Rao, MD', specialty: 'Family Medicine',
    visitType: 'Office visit', pos: '11 · Office', facility: 'Northside Family Clinic', payer: 'Aetna PPO', plan: 'Open Access Choice',
    member: 'W221044719', ptype: 'est', lastSeen: '06/12/2026', allergy: 'NKDA',
  },
  original: {
    dx: [{ code: 'R50.9' }, { code: 'J01.90' }, { code: 'J45.909' }],
    lines: [
      { code: '99214', mods: [], units: 1, ptrs: ['R50.9', 'J01.90'] },
      { code: '96372', mods: [], units: 1, ptrs: [] },
      { code: 'J0696', mods: [], units: 1, ptrs: ['J01.90'] },
    ],
    rules: ['Missing diagnosis pointer', 'Drug units vs administered dose', 'E/M review for 25/59 modifier', 'Sign/symptom with definitive diagnosis'],
    enteredBy: 'Anita Rao, MD',
  },
  answerKey: [
    { code: 'J01.01', desc: 'Acute recurrent maxillary sinusitis', type: 'PDx', why: 'HPI and plan document a third episode this year — "acute recurrent maxillary sinusitis".' },
    { code: 'J45.20', desc: 'Mild intermittent asthma, uncomplicated', type: 'SDx', why: 'Asthma was assessed ("stable; continue albuterol") so it is reported. Type is documented as mild intermittent.' },
    { code: '99214', desc: 'Office/outpatient visit, established, moderate MDM', type: 'CPT', mods: ['25'], units: 1, ptrs: ['J01.01', 'J45.20'], why: 'Moderate MDM (acute illness with systemic symptoms + prescription drug management); 32 min also supports 99214. Needs modifier 25 because a separate procedure (96372) was billed the same day.' },
    { code: '96372', desc: 'Therapeutic injection, subcutaneous or intramuscular', type: 'CPT', mods: [], units: 1, ptrs: ['J01.01'], why: 'IM injection administered by clinic staff, linked to the sinusitis it treated.' },
    { code: 'J0696', desc: 'Injection, ceftriaxone sodium, per 250 mg', type: 'HCPCS', mods: [], units: 4, ptrs: ['J01.01'], why: 'J0696 is per 250 mg. 1 g = 1,000 mg ÷ 250 = 4 units.' },
  ],
  keyMeta: {
    extraWhy: {
      'R50.9': 'Fever is a symptom of the sinusitis. Signs and symptoms that are part of a confirmed diagnosis are not coded (OCG I.B.5).',
      'J01.90': 'Unspecified. The note documents the site (maxillary) and that it is recurrent → J01.01.',
      'J45.909': 'Unspecified. The note says "mild intermittent" → J45.20.',
    },
  },
  cdiResponse: 'Confirmed: acute recurrent maxillary sinusitis (third episode this year). Asthma is mild intermittent and was addressed at this visit.',
};

// ---------------------------------------------------------------- E/M: denial
const bellNote = `PROGRESS NOTE — BEHAVIORAL HEALTH FOLLOW-UP
MRN: K550231   Account #: G7781204
Insurance: Keystone Medicaid
Facility: Riverside Community Health (FQHC)
Date of Service: 02/19/2026
Provider: Katia Nunez, CRNP (Behavioral Health)
Patient type: Established patient

CHIEF COMPLAINT:
Follow-up for anxiety and medication management.

SUBJECTIVE:
41-year-old male here for follow-up of generalized anxiety disorder on sertraline. Reports worry and poor sleep are improving. Drinks 4-5 beers most evenings; agrees it is a problem, no withdrawal symptoms, no prior treatment.

OBJECTIVE:
BP 134/86, HR 78. Alert, cooperative, mildly anxious affect. No tremor.

ASSESSMENT & PLAN:
1. Generalized anxiety disorder — improving; continue sertraline 100 mg, refills sent.
2. Alcohol abuse, uncomplicated — counselled 10 min, referred to behavioral health program.
3. Long-term sertraline use — monitoring.
Medication list reviewed and documented. BP recorded.`;

const EM_DENIAL = {
  _id: 'EM-7002',
  workType: 'denial',
  difficulty: 'advanced',
  title: 'Denial CO-4 — FQHC encounter billed with modifier 25',
  patient: { name: 'Marcus Bell', sex: 'M', age: 41 },
  record: bellNote,
  documents: [{ key: 'note', title: 'Progress Note', sub: '02/19/2026 · K. Nunez, CRNP', body: bellNote }],
  encounter: {
    mrn: 'K550231', acct: 'G7781204', encounterId: 'E-771045', dos: '02/19/2026', provider: 'Katia Nunez, CRNP', specialty: 'Behavioral Health',
    visitType: 'Office visit (FQHC)', pos: '50 · FQHC', facility: 'Riverside Community Health', payer: 'Keystone Medicaid', plan: 'Medicaid Managed Care',
    member: 'MCD-0038812', ptype: 'est', allergy: 'Penicillin',
  },
  original: {
    dx: [{ code: 'Z79.899' }, { code: 'F41.1' }, { code: 'F10.10' }],
    lines: [
      { code: 'T1015', mods: ['25'], units: 1, ptrs: ['Z79.899', 'F41.1', 'F10.10'], remit: 'CO-4', billed: 416.77 },
      { code: '99213', mods: ['25'], units: 1, ptrs: ['Z79.899', 'F41.1'], remit: '', billed: 0 },
      { code: '3075F', mods: [], units: 1, ptrs: ['Z79.899'], remit: 'CO-97', billed: 10 },
      { code: '3079F', mods: [], units: 1, ptrs: ['Z79.899'], remit: 'CO-97', billed: 10 },
      { code: '1159F', mods: [], units: 1, ptrs: ['Z79.899'], remit: '', billed: 0 },
      { code: '1160F', mods: [], units: 1, ptrs: ['Z79.899'], remit: '', billed: 0 },
    ],
  },
  denial: {
    queue: 'PB Follow-up — Coding Denials',
    invoice: { num: 'INV-55018273', icn: '2026031901125', status: 'Denied', received: '03/18/2026', billed: 436.77, allowed: 0, daysToAppeal: 26 },
    history: [
      ['02/19/2026', 'Charge posted', 'T1015, 99213, 3075F, 3079F, 1159F, 1160F', '$436.77'],
      ['02/20/2026', 'Claim sent', 'Keystone Medicaid · electronic 837P', ''],
      ['03/18/2026', 'Remittance (835)', 'Denied — CO-4 on T1015; CO-97 on 3075F, 3079F', '$0.00'],
      ['03/18/2026', 'Moved to coding denials', 'Coding denial follow-up', ''],
    ],
  },
  answerKey: [
    { code: 'F41.1', desc: 'Generalized anxiety disorder', type: 'PDx', why: 'The visit was for anxiety follow-up. A Z code for long-term drug therapy is not listed first when the condition being treated is documented.' },
    { code: 'F10.10', desc: 'Alcohol abuse, uncomplicated', type: 'SDx', why: 'Assessed and counselled at this visit.' },
    { code: 'Z79.899', desc: 'Other long term (current) drug therapy', type: 'SDx', why: 'Long-term sertraline, monitored.' },
    { code: 'T1015', desc: 'Clinic visit/encounter, all-inclusive', type: 'HCPCS', mods: [], ptrs: ['F41.1', 'F10.10', 'Z79.899'], why: 'T1015 is the all-inclusive FQHC encounter code; modifier 25 is not valid on it and caused the CO-4.' },
    { code: '99213', desc: 'Office/outpatient visit, established, low MDM', type: 'CPT', mods: [], ptrs: ['F41.1', 'Z79.899'], why: 'The E/M is bundled into the FQHC encounter rate, so there is no separate procedure to justify modifier 25.' },
    { code: '3075F', desc: 'Most recent systolic blood pressure 130-139 mm Hg', type: 'CPT', mods: [], why: 'CO-97 = paid as part of another service. Quality (Category II) codes are informational; no correction needed.' },
    { code: '3079F', desc: 'Most recent diastolic blood pressure 80-89 mm Hg', type: 'CPT', mods: [], why: 'CO-97 = paid as part of another service. No correction needed.' },
    { code: '1159F', desc: 'Medication list documented in medical record', type: 'CPT', why: 'Quality code, reported as documented.' },
    { code: '1160F', desc: 'Review of all medications by prescribing practitioner documented', type: 'CPT', why: 'Quality code, reported as documented.' },
  ],
  keyMeta: {
    decision: 'correct',
    decisionWhy: 'CO-4 means the modifier is wrong for the code. That is a billing error on our side, so the fix is a corrected claim, not an appeal or a write-off.',
  },
};

// ---------------------------------------------------------------- Inpatient
const ipDocs = [
  {
    key: 'ed', title: 'ED Provider Note', sub: '03/14 21:40 · K. Ruiz, DO',
    body: `EMERGENCY DEPARTMENT PROVIDER NOTE
03/14/2026 21:40 · Mercy General ED · K. Ruiz, DO

CHIEF COMPLAINT:
Worsening shortness of breath x 3 days.

HPI:
68-year-old female with COPD on home oxygen 2 L, type 2 diabetes, hypertension and chronic kidney disease presents with increasing dyspnea, productive cough and wheezing for three days. She used her rescue inhaler every 2 hours today without relief. Former smoker, quit 2015 (40 pack-years).

EXAM:
RR 30, SpO2 82% on 2 L, accessory muscle use, diffuse expiratory wheezes, speaking in 3-4 word sentences.

ED COURSE:
ABG on 2 L: pH 7.31, pCO2 58, pO2 52. Duonebs x3, methylprednisolone 125 mg IV. Started on BiPAP 14/6 at 22:15.

IMPRESSION:
Acute hypoxic respiratory failure due to COPD exacerbation. Admit to step-down, hospitalist service.`,
  },
  {
    key: 'hp', title: 'History & Physical', sub: '03/15 01:10 · R. Patel, MD',
    body: `ADMISSION HISTORY & PHYSICAL
03/15/2026 01:10 · R. Patel, MD · Hospitalist

REASON FOR ADMISSION:
Acute hypoxic respiratory failure secondary to acute exacerbation of COPD.

PAST MEDICAL HISTORY:
COPD (GOLD 3) on home O2 2 L continuous. Type 2 diabetes mellitus on metformin. Hypertension. Chronic kidney disease stage 3a, baseline creatinine 1.3. History of tobacco dependence, in remission.

MEDICATIONS:
Metformin 500 mg BID, lisinopril 10 mg daily, tiotropium, albuterol PRN, home oxygen 2 L.

ASSESSMENT & PLAN:
1. Acute hypoxic respiratory failure — present on admission, due to #2. Continue BiPAP, wean as tolerated, titrate O2 to SpO2 88-92%.
2. Acute exacerbation of COPD — IV steroids, scheduled nebulizers, azithromycin.
3. Type 2 diabetes with hyperglycemia — glucose 286 on steroids; hold metformin while inpatient, sliding-scale insulin.
4. Hypertensive chronic kidney disease, CKD stage 3a — creatinine at baseline; continue lisinopril.`,
  },
  {
    key: 'rt', title: 'Respiratory Therapy Flowsheet', sub: '03/14 – 03/16',
    body: `RESPIRATORY THERAPY — VENTILATION FLOWSHEET
Non-invasive ventilation record

EVENTS:
03/14 22:15 — BiPAP initiated in ED — IPAP 14 / EPAP 6, FiO2 40%
03/15 10:00 — Continued — IPAP 12 / EPAP 6, FiO2 35%
03/16 06:30 — BiPAP discontinued, to 3 L nasal cannula

SUMMARY:
Total continuous non-invasive ventilation: 32 hours 15 minutes.`,
  },
  {
    key: 'pn', title: 'Progress Note — Day 2', sub: '03/16 09:20 · R. Patel, MD',
    body: `HOSPITALIST PROGRESS NOTE
03/16/2026 09:20 · R. Patel, MD

SUBJECTIVE:
Breathing improved. Off BiPAP this morning.

OBJECTIVE:
SpO2 92% on 3 L. Glucose 210-260 on steroids.

ASSESSMENT:
Acute hypoxic respiratory failure, resolving. COPD exacerbation improving. Type 2 DM with hyperglycemia, steroid-related; diabetic CKD stage 3a, stable.`,
  },
  {
    key: 'lab', title: 'Laboratory Results', sub: '03/14 – 03/17',
    body: `LABORATORY RESULTS
Collected 03/14 – 03/17 (reference range in brackets)

CHEMISTRY:
Glucose: 248 (H) · 286 (H) · 198 (H) [70-99]
Creatinine: 1.34 · 1.30 · 1.28 [0.6-1.1]
eGFR: 49 (L) · 51 (L) · 52 (L) [>60]
HbA1c: 8.1% (H) [<5.7]

ARTERIAL BLOOD GAS:
pO2 52 (L) on 03/14 · 71 on 03/15 [80-100]`,
  },
  {
    key: 'cxr', title: 'Chest X-ray Report', sub: '03/14 22:05 · Radiology',
    body: `CHEST RADIOGRAPH, 1 VIEW
03/14/2026 22:05 · J. Lin, MD

FINDINGS:
Hyperinflated lungs with flattened diaphragms. No focal consolidation, effusion or pneumothorax.

IMPRESSION:
Emphysematous changes. No acute pneumonia.`,
  },
  {
    key: 'ds', title: 'Discharge Summary', sub: '03/18 11:05 · R. Patel, MD',
    body: `DISCHARGE SUMMARY
03/18/2026 11:05 · R. Patel, MD

PRINCIPAL DIAGNOSIS:
Acute hypoxic respiratory failure due to acute exacerbation of COPD.

SECONDARY DIAGNOSES:
Type 2 diabetes mellitus with hyperglycemia and diabetic chronic kidney disease stage 3a. Hypertension. Dependence on home oxygen. History of tobacco dependence. Long-term metformin use.

PROCEDURES:
Non-invasive positive pressure ventilation (BiPAP), 03/14-03/16.

DISPOSITION:
Home with home oxygen 2 L. Resume metformin. No home health services ordered.`,
  },
];
const ipRecord = `INPATIENT ENCOUNTER — MARGARET A. DOE
MRN: M00418822   Account #: V0019304471
Insurance: Medicare Part A
Facility: Mercy General Hospital
Admission Date: 03/14/2026
Provider: R. Patel, MD (Hospitalist)

${ipDocs.map((d) => d.body).join('\n\n')}`;
const ipEncounter = {
  mrn: 'M00418822', acct: 'V0019304471', encounterId: 'IP-0412', admit: '03/14/2026', discharge: '03/18/2026', los: 4,
  provider: 'R. Patel, MD', specialty: 'Hospitalist', facility: 'Mercy General Hospital', payer: 'Medicare Part A', allergy: 'Penicillin',
};
const ipKey = [
  { code: 'J96.01', desc: 'Acute respiratory failure with hypoxia', type: 'PDx', poa: 'Y', why: 'Respiratory failure is the condition that occasioned the admission and was present on admission (OCG I.C.10.b.1; Section II).' },
  { code: 'J44.1', desc: 'COPD with (acute) exacerbation', type: 'SDx', poa: 'Y', why: 'COPD exacerbation is the underlying cause — "Code also" note at J96.0-.' },
  { code: 'E11.22', desc: 'Type 2 diabetes mellitus with diabetic chronic kidney disease', type: 'SDx', poa: 'Y', why: '"With" convention (OCG I.A.15): diabetes and CKD are presumed linked; the physician also states "diabetic CKD".' },
  { code: 'E11.65', desc: 'Type 2 diabetes mellitus with hyperglycemia', type: 'SDx', poa: 'Y', why: 'Hyperglycemia documented (glucose 286, "with hyperglycemia").' },
  { code: 'I12.9', desc: 'Hypertensive CKD with stage 1-4 CKD or unspecified CKD', type: 'SDx', poa: 'Y', why: 'Hypertension with CKD is presumed hypertensive CKD (OCG I.C.9.a.2).' },
  { code: 'N18.31', desc: 'Chronic kidney disease, stage 3a', type: 'SDx', poa: 'Y', why: '"Use additional code" at I12.9 and E11.22 for the CKD stage (3a).' },
  { code: 'Z99.81', desc: 'Dependence on supplemental oxygen', type: 'SDx', poa: '1', why: 'Home O2 2 L continuous — "Use additional code" at J44. POA-exempt.' },
  { code: 'Z87.891', desc: 'Personal history of nicotine dependence', type: 'SDx', poa: '1', why: 'Former smoker; tobacco dependence in remission/history. POA-exempt.' },
  { code: 'Z79.84', desc: 'Long term (current) use of oral hypoglycemic drugs', type: 'SDx', poa: '1', why: 'Long-term metformin (held inpatient, resumed at discharge). POA-exempt.' },
  { code: '5A09458', desc: 'Assistance with respiratory ventilation, 24-96 consecutive hours, intermittent positive airway pressure', type: 'PCS', why: 'BiPAP for 32 h 15 min → duration 24-96 consecutive hours; BiPAP = intermittent positive airway pressure.' },
  { code: '189', desc: 'Pulmonary edema & respiratory failure', type: 'DRG', why: 'MS-DRG 189 follows from J96.01 as principal diagnosis. A different DRG means the hospital is paid the wrong amount.' },
];
const ipMeta = {
  disp: '01 · Home / self-care',
  dispWhy: 'Discharged home with home oxygen only and no home health services ordered → 01. Disposition changes the payment for post-acute transfer DRGs.',
  extraWhy: {
    I10: 'Hypertension with CKD is presumed hypertensive CKD → I12.9 (OCG I.C.9.a.2). I10 has an Excludes1 for I12.-.',
    'E11.9': 'Complications (CKD, hyperglycemia) are documented, so "without complications" is wrong.',
    'J44.9': 'Unspecified — the exacerbation is documented → J44.1.',
    'J96.00': 'Unspecified — hypoxia is documented (pO2 52, "hypoxic") → J96.01.',
    'N18.9': 'Unspecified — stage 3a is documented → N18.31.',
    'R06.02': 'Shortness of breath is integral to respiratory failure / COPD exacerbation (OCG I.B.5).',
    'J18.9': 'Chest X-ray: "No acute pneumonia". Never code a condition the record rules out.',
  },
};
const ipCdi = 'Type 2 diabetes mellitus with hyperglycemia, worsened by systemic steroids. Hyperglycemia was monitored and treated with sliding-scale insulin.';

const IP_CODE = {
  _id: 'IP-7001', workType: 'code', difficulty: 'advanced', title: 'Acute hypoxic respiratory failure due to COPD exacerbation',
  patient: { name: 'Margaret A. Doe', sex: 'F', age: 68 }, record: ipRecord, documents: ipDocs, encounter: ipEncounter,
  answerKey: ipKey, keyMeta: ipMeta, cdiResponse: ipCdi,
};
const IP_DRG = {
  _id: 'IP-7002', workType: 'drg', difficulty: 'advanced', title: 'DRG validation — respiratory failure / COPD',
  patient: { name: 'Margaret A. Doe', sex: 'F', age: 68 }, record: ipRecord, documents: ipDocs,
  encounter: { ...ipEncounter, encounterId: 'IP-0398' },
  original: {
    dx: [{ code: 'J44.1', poa: 'Y' }, { code: 'E11.65', poa: '' }, { code: 'I10', poa: 'Y' }, { code: 'J96.01', poa: 'Y' }],
    pcs: [],
    disp: '06 · Home health',
    drg: '190 — COPD w MCC',
    rules: ['POA indicator missing', 'Principal diagnosis sequencing', 'Hypertension with CKD'],
    enteredBy: 'Auto-coder',
  },
  answerKey: ipKey, keyMeta: ipMeta, cdiResponse: ipCdi,
};

const CASES = { EM: [EM_REVIEW, EM_DENIAL], IP: [IP_CODE, IP_DRG] };

const seed = async () => {
  const append = process.argv.includes('--append');
  await connectDB();
  for (const [dept, cases] of Object.entries(CASES)) {
    const sample = await Chart.findOne({ dept }).select('deptName').lean();
    if (!sample) {
      console.log(`${dept}: no charts in this department — run seed:charts first. Skipped.`);
      continue;
    }
    const exists = new Set((await Chart.find({ _id: { $in: cases.map((c) => c._id) } }).select('_id').lean()).map((c) => c._id));
    const fresh = cases.filter((c) => !exists.has(c._id));
    let next;
    if (fresh.length && !append) {
      // Move every chart down by k (via a temporary offset, so the unique (dept, position) index never clashes).
      await Chart.updateMany({ dept }, { $inc: { position: SHIFT } });
      await Chart.updateMany({ dept, position: { $gte: SHIFT } }, { $inc: { position: fresh.length - SHIFT } });
      next = 1;
    } else {
      const last = await Chart.findOne({ dept }).sort({ position: -1 }).select('position').lean();
      next = (last ? last.position : 0) + 1;
    }
    for (const c of cases) {
      const doc = { ...c, dept, deptName: sample.deptName, source: 'builtin', handwritten: false };
      if (exists.has(c._id)) {
        const { _id, ...rest } = doc;
        await Chart.updateOne({ _id }, { $set: rest }, { runValidators: true });
        console.log(`${c._id}: updated (${c.workType})`);
      } else {
        await Chart.create({ ...doc, position: next });
        console.log(`${c._id}: inserted at position ${next} (${c.workType})`);
        next += 1;
      }
    }
  }
};

seed()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
  });

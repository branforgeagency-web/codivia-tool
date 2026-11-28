// How an uploaded chart file fills the admin upload form (utils/readChartText.js).
// A file is split into blocks by marker lines such as "===== ANSWER KEY =====". Inside a block,
// "Label: value" lines fill fields; the label words and value words below are matched without case.
// Only the CHART block (or the whole file when it has no markers) becomes the record students read.
const { DEMOGRAPHICS } = require('./demographics');
const { CASE_LIMITS } = require('./chartUploads');

const CHART_IMPORT = Object.freeze({
  blocks: {
    setup: ['CHART SETUP', 'SETUP'],
    chart: ['CHART', 'MEDICAL RECORD', 'RECORD'],
    original: ['ORIGINAL CODING', 'ORIGINAL CLAIM', 'ORIGINAL CHARGES'],
    denial: ['DENIAL', 'DENIAL DETAILS'],
    key: ['ANSWER KEY'],
    cdi: ['CDI RESPONSE', 'PHYSICIAN QUERY RESPONSE'],
    // May repeat: one block per earlier visit / per episode of care.
    previous: ['PREVIOUS RECORD', 'PREVIOUS VISIT', 'EARLIER VISIT', 'PRIOR ENCOUNTER'],
    episode: ['EPISODE', 'EPISODE OF CARE'],
    note: ['NOTE', 'CLINICAL NOTE', 'TRANSCRIPTION'], // one block per note (H&P, consult, op report …)
    // Structured results and orders (LAB | …, MED | … rows); the rows may also sit in the CHART block.
    clinical: ['CLINICAL DATA', 'RESULTS', 'RESULTS AND ORDERS', 'ORDERS', 'LABS', 'MEDICATIONS', 'LDAS'],
  },
  repeatBlocks: ['previous', 'episode', 'note'],

  // "Label: value" fields, by the group they fill.
  labels: {
    // Demographics (DOB, address, language, employer, contacts …): words from config/demographics.js.
    demographics: Object.fromEntries(DEMOGRAPHICS.fields.filter((f) => f.aliases).map((f) => [f.key, f.aliases])),
    setup: {
      dept: ['Department', 'Dept'],
      title: ['Title', 'Chart Title'],
      encounterType: ['Encounter Type'],
      billingType: ['Billing Type'],
      workType: ['Work Type'],
      difficulty: ['Difficulty'],
    },
    patient: {
      name: ['Patient', 'Patient Name'],
      sex: ['Sex', 'Gender'],
      age: ['Age'],
    },
    encounter: {
      mrn: ['MRN', 'Med Rec Num', 'Medical Record Number'],
      acct: ['Account #', 'Account', 'Account Number', 'HAR'],
      encounterId: ['Encounter ID', 'CSN'],
      dos: ['Date of Service', 'DOS'],
      admit: ['Admit Date', 'Admission Date'],
      discharge: ['Discharge Date'],
      los: ['LOS', 'Length of Stay'],
      provider: ['Provider', 'Attending', 'Attending Physician', 'Rendering Provider'],
      specialty: ['Specialty'],
      visitType: ['Visit Type'],
      pos: ['Place of Service', 'POS'],
      facility: ['Facility'],
      payer: ['Payer', 'Insurance'],
      plan: ['Insurance Plan', 'Plan Name'],
      member: ['Member ID'],
      ptype: ['Patient Type', 'Patient Status'],
      lastSeen: ['Last Seen'],
      allergy: ['Allergies', 'Allergy'],
      episode: ['Episode', 'Episode of Care'], // links this visit to an EPISODE block by name
      // Emergency visit details (Chart Review › ED Visits).
      arrival: ['Arrival', 'Arrival Time', 'Arrival Date', 'ED Arrival'],
      departure: ['Departure', 'Departure Time', 'ED Departure'],
      acuity: ['Acuity', 'ESI', 'Triage Acuity', 'Triage Level'],
      disposition: ['ED Disposition', 'Disposition'],
    },
    // PREVIOUS RECORD block: the visit's details; other plain lines are its note, and
    // "TYPE | CODE | description" rows (key types below) are the codes billed on it.
    previous: {
      title: ['Title', 'Visit', 'Record Title', 'Visit Type'],
      dos: ['Date of Service', 'DOS', 'Date'],
      provider: ['Provider', 'Attending', 'Rendering Provider'],
      facility: ['Facility', 'Department', 'Dept'],
      episode: ['Episode', 'Episode of Care'],
      noteType: ['Note Type', 'Document Type'],
      arrival: ['Arrival', 'Arrival Time', 'Arrival Date', 'ED Arrival'],
      departure: ['Departure', 'Departure Time', 'ED Departure'],
      acuity: ['Acuity', 'ESI', 'Triage Acuity', 'Triage Level'],
      disposition: ['ED Disposition', 'Disposition'],
    },
    // EPISODE block: one episode of care (pregnancy, therapy, oncology, surgery + follow-ups …).
    episode: {
      name: ['Name', 'Episode', 'Episode Name'],
      type: ['Type', 'Episode Type'],
      status: ['Status'],
      start: ['Start', 'Start Date', 'Onset'],
      end: ['End', 'End Date', 'Resolved Date'],
      provider: ['Provider', 'Responsible Provider'],
      dx: ['Diagnosis', 'Dx', 'Problem'],
      note: ['Note', 'Comment', 'Notes'],
    },
    // NOTE block: one clinical note of this visit; the other lines are the note's text.
    note: {
      type: ['Type', 'Note Type', 'Document Type'],
      title: ['Title', 'Note Title'],
      author: ['Author', 'Provider', 'Signed By', 'Written By'],
      specialty: ['Specialty'],
      date: ['Date', 'Note Date', 'Date of Service', 'DOS'],
      status: ['Status', 'Note Status'],
      recipient: ['To', 'Recipient', 'Addressed To'], // letters: who it was sent to
    },
    original: {
      disp: ['Discharge Disposition', 'Disposition'],
      drg: ['DRG', 'MS-DRG'],
      enteredBy: ['Entered By', 'Coded By'],
      rules: ['Rule', 'Edit'], // may repeat
    },
    denial: {
      queue: ['Queue', 'Work Queue'],
      num: ['Claim #', 'Invoice #', 'Claim Number', 'Invoice'],
      icn: ['ICN'],
      status: ['Claim Status', 'Status'],
      received: ['Remit Received', 'Received'],
      billed: ['Billed', 'Billed Amount'],
      allowed: ['Allowed', 'Allowed Amount'],
      daysToAppeal: ['Days to Appeal', 'Days Left to Appeal'],
    },
    keyMeta: {
      disp: ['Discharge Disposition', 'Disposition'],
      dispWhy: ['Disposition Why', 'Disposition Reason'],
      decision: ['Decision', 'Denial Decision'],
      decisionWhy: ['Decision Why', 'Decision Reason'],
    },
  },

  // Words accepted for option fields → the stored value.
  values: {
    sex: { F: ['f', 'female', 'woman'], M: ['m', 'male', 'man'] },
    encounterType: { OP: ['op', 'outpatient', 'out-patient', 'o/p'], IP: ['ip', 'inpatient', 'in-patient', 'i/p'] },
    billingType: {
      facility: ['facility', 'hospital', 'hospital facility', 'institutional', 'ub-04'],
      professional: ['professional', 'pro', 'physician', 'cms-1500'],
    },
    workType: {
      code: ['code', 'coding', 'new chart', 'new'],
      review: ['review', 'charge review'],
      denial: ['denial', 'denial review', 'denial management'],
      drg: ['drg', 'drg validation'],
    },
    difficulty: { beginner: ['beginner', 'easy', 'basic'], moderate: ['moderate', 'medium', 'intermediate'], advanced: ['advanced', 'hard', 'difficult'] },
    ptype: { new: ['new', 'new patient'], est: ['est', 'established', 'established patient'] },
    decision: { correct: ['correct', 'correct and resubmit', 'resubmit'], appeal: ['appeal'], writeoff: ['writeoff', 'write off', 'write-off'] },
    episodeStatus: {
      Active: ['active', 'open', 'ongoing', 'current'],
      Resolved: ['resolved', 'closed', 'complete', 'completed', 'ended', 'inactive'],
    },
    yes: ['y', 'yes', 'true', '1'],
  },

  // Pipe rows "TYPE | CODE | …": the first cell, as written → the answer key type.
  keyTypes: {
    PDx: ['pdx', 'principal', 'primary', 'principal dx', 'primary dx'],
    SDx: ['sdx', 'secondary', 'secondary dx'],
    Dx: ['dx'],
    CPT: ['cpt', 'e/m', 'em'],
    HCPCS: ['hcpcs'],
    MOD: ['mod', 'modifier'],
    PCS: ['pcs', 'icd-10-pcs'],
    DRG: ['drg', 'ms-drg'],
  },
  // Structured rows → chart.clinical[kind] (Chart Review tabs Labs, Meds, Other Orders, LDAs, Proc,
  // Anes, Media). "KIND | cell | cell …": the first cell names the kind, the others fill `fields` in
  // order (blank cells allowed). E.g. LAB | Hemoglobin | 10.2 | g/dL | 12.0-16.0 | L | 11/20/2026 | Final
  clinicalRows: {
    labs: { label: 'Labs', words: ['lab', 'labs', 'lab result'], fields: ['test', 'value', 'units', 'range', 'flag', 'collected', 'status'] },
    meds: { label: 'Medications', words: ['med', 'meds', 'medication', 'rx'], fields: ['name', 'dose', 'route', 'frequency', 'prescriber', 'start', 'status', 'end'] },
    orders: { label: 'Other orders', words: ['order', 'other order'], fields: ['order', 'type', 'status', 'orderedBy', 'date'] },
    ldas: { label: 'LDAs', words: ['lda', 'device', 'drain', 'airway'], fields: ['device', 'site', 'inserted', 'removed', 'status'] },
    procedures: { label: 'Procedures', words: ['proc', 'procedure'], fields: ['procedure', 'date', 'performedBy', 'status'] },
    anesthesia: { label: 'Anesthesia', words: ['anes', 'anesthesia', 'anaesthesia'], fields: ['type', 'asa', 'start', 'stop', 'provider', 'procedure'] },
    // Cardiology studies: measurements are "name value" pairs split by ; (HR 112; QTc 440 ms; EF 35%).
    cards: { label: 'Cardiology', words: ['card', 'cardiology', 'ekg', 'ecg', 'echo'], fields: ['study', 'date', 'interpretation', 'measurements', 'flag', 'status', 'readBy'] },
    // Treatments activity: plans (sessions "done/planned", e.g. 4/12) and medicines actually given (MAR).
    treatments: { label: 'Treatment plans', words: ['treatment', 'treatment plan', 'plan of care'], fields: ['plan', 'type', 'dx', 'schedule', 'sessions', 'status', 'orderedBy', 'approval', 'instructions', 'orderRef', 'start', 'end'] },
    given: { label: 'Medications given', words: ['admin', 'given', 'mar', 'administered'], fields: ['drug', 'dose', 'route', 'start', 'stop', 'givenBy', 'dx', 'orderRef'] },
    outcomeForms: { label: 'Outcome forms', words: ['outcome form', 'questionnaire'], fields: ['name', 'date', 'status', 'episode', 'responses'] },
    outcomeScores: { label: 'Outcome scores', words: ['outcome score', 'prom score'], fields: ['measure', 'domain', 'date', 'score', 'scale', 'milestone', 'episode'] },
    outcomeTasks: { label: 'Outcome tasks', words: ['outcome task'], fields: ['name', 'due', 'status', 'assignedTo', 'episode', 'detail'] },
    outcomeMessages: { label: 'Outcome messages', words: ['outcome message'], fields: ['subject', 'date', 'from', 'to', 'episode', 'body'] },
    patientMessages: { label: 'Patient portal messages', words: ['patient message', 'portal message'], fields: ['thread', 'subject', 'sentAt', 'from', 'to', 'category', 'body'], limits: { body: CASE_LIMITS.why } },
    digitalVisits: { label: 'Digital E/M documentation', words: ['digital em', 'digital e/m'], fields: ['thread', 'initiatedBy', 'patientRelationship', 'period', 'clinician', 'minutes', 'assessment', 'relatedCare'], limits: { assessment: CASE_LIMITS.why, relatedCare: CASE_LIMITS.why } },
    flowsheetEntries: { label: 'Flowsheet entries', words: ['flowsheet', 'flowsheet entry'], fields: ['group', 'measure', 'recordedAt', 'value', 'unit', 'recordedBy', 'note'], limits: { value: CASE_LIMITS.why, note: CASE_LIMITS.why } },
    media: { label: 'Media', words: ['media', 'scan', 'attachment'], fields: ['document', 'type', 'date', 'from'] },
  },
  notReported: ['not reported', 'do not report', 'not coded'], // "NOT REPORTED | CODE | reason"
  // Original-coding rows: DX | code | POA   ·   LINE | code | mods | units | pointers | remit | billed   ·   PCS | code
  originalRows: { dx: ['dx', 'diagnosis'], line: ['line', 'cpt', 'hcpcs', 'charge'], pcs: ['pcs'] },
  historyRow: ['history'], // denial block: HISTORY | date | event | detail | amount
  // Extra cells on a key row: "POA: Y", "MOD: 25,59", "Units: 2", "Ptrs: A,B", "Uncertain: yes"
  keyExtras: { poa: ['poa'], mods: ['mod', 'mods', 'modifier', 'modifiers'], units: ['units', 'unit'], ptrs: ['ptrs', 'pointers', 'dx pointer', 'dx pointers'], uncertain: ['uncertain'] },
});

module.exports = { CHART_IMPORT };

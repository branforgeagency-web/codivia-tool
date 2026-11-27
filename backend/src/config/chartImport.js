// How an uploaded chart file fills the admin upload form (utils/readChartText.js).
// A file is split into blocks by marker lines such as "===== ANSWER KEY =====". Inside a block,
// "Label: value" lines fill fields; the label words and value words below are matched without case.
// Only the CHART block (or the whole file when it has no markers) becomes the record students read.
const { DEMOGRAPHICS } = require('./demographics');

const CHART_IMPORT = Object.freeze({
  blocks: {
    setup: ['CHART SETUP', 'SETUP'],
    chart: ['CHART', 'MEDICAL RECORD', 'RECORD'],
    original: ['ORIGINAL CODING', 'ORIGINAL CLAIM', 'ORIGINAL CHARGES'],
    denial: ['DENIAL', 'DENIAL DETAILS'],
    key: ['ANSWER KEY'],
    cdi: ['CDI RESPONSE', 'PHYSICIAN QUERY RESPONSE'],
  },

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
  notReported: ['not reported', 'do not report', 'not coded'], // "NOT REPORTED | CODE | reason"
  // Original-coding rows: DX | code | POA   ·   LINE | code | mods | units | pointers | remit | billed   ·   PCS | code
  originalRows: { dx: ['dx', 'diagnosis'], line: ['line', 'cpt', 'hcpcs', 'charge'], pcs: ['pcs'] },
  historyRow: ['history'], // denial block: HISTORY | date | event | detail | amount
  // Extra cells on a key row: "POA: Y", "MOD: 25,59", "Units: 2", "Ptrs: A,B", "Uncertain: yes"
  keyExtras: { poa: ['poa'], mods: ['mod', 'mods', 'modifier', 'modifiers'], units: ['units', 'unit'], ptrs: ['ptrs', 'pointers', 'dx pointer', 'dx pointers'], uncertain: ['uncertain'] },
});

module.exports = { CHART_IMPORT };

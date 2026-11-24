// Encounter type (OP / IP) and billing type of a chart, and the diagnosis classifications each one uses.
//
//   OP - outpatient: the first-listed diagnosis is the PRIMARY diagnosis (ICD-10-CM OCG Section IV).
//        Procedures are CPT / HCPCS.
//   IP - inpatient: the first-listed diagnosis is the PRINCIPAL diagnosis (OCG Section II). The
//        billing type decides the procedure code set:
//          facility     - hospital (UB-04) claim: ICD-10-PCS, POA indicators, abstract, MS-DRG
//          professional - physician (CMS-1500) claim: CPT / HCPCS charge lines, no POA
//
// Charts created before encounter types existed have no encounterType. They keep the behaviour they
// were graded under: inpatient (facility) when their department codes ICD-10-PCS or MS-DRG, else
// outpatient. Nothing is written to them; see scripts/migrateEncounterTypes.js for the opt-in backfill.

const ENCOUNTER_TYPES = Object.freeze({ OP: 'OP', IP: 'IP' });
const ENCOUNTER_TYPE_LIST = Object.freeze(Object.values(ENCOUNTER_TYPES));
const ENCOUNTER_TYPE_LABELS = Object.freeze({ OP: 'Outpatient', IP: 'Inpatient' });

const BILLING_TYPES = Object.freeze({ FACILITY: 'facility', PROFESSIONAL: 'professional' });
const BILLING_TYPE_LIST = Object.freeze(Object.values(BILLING_TYPES));
const BILLING_TYPE_LABELS = Object.freeze({ facility: 'Hospital facility', professional: 'Professional' });

// Diagnosis classification of one row of the student's diagnosis list (draft.dx[].cls).
const DX_CLASSES = Object.freeze({ PRIMARY: 'primary', PRINCIPAL: 'principal', SECONDARY: 'secondary' });
const DX_CLASS_LIST = Object.freeze(Object.values(DX_CLASSES));
const DX_CLASS_LABELS = Object.freeze({ primary: 'Primary diagnosis', principal: 'Principal diagnosis', secondary: 'Secondary diagnosis' });

// The first-listed classification for an encounter type.
const firstListedClass = (encounterType) => (encounterType === ENCOUNTER_TYPES.IP ? DX_CLASSES.PRINCIPAL : DX_CLASSES.PRIMARY);

// Department elements that made a department "inpatient" before charts had an encounter type.
const isInpatientElements = (elements) => (elements || []).some((e) => e === 'ICD10PCS' || e === 'DRG');

// How a chart is coded: its encounter type, billing type and what follows from them.
//   explicit     - the chart has its own encounterType (false = derived from the department)
//   facilityIP   - inpatient hospital claim: POA, ICD-10-PCS, abstract and MS-DRG apply
//   uncertainAsConfirmed - uncertain diagnoses ("probable", "suspected") at discharge are coded as if
//                  established (OCG II.H / III.C). Only for inpatient facility admissions; outpatient and
//                  professional services code the signs and symptoms instead (OCG IV.H).
const encounterProfile = (chart = {}, deptElements = []) => {
  const explicit = ENCOUNTER_TYPE_LIST.includes(chart.encounterType);
  const legacyIP = isInpatientElements(deptElements);
  const encounterType = explicit ? chart.encounterType : legacyIP ? ENCOUNTER_TYPES.IP : ENCOUNTER_TYPES.OP;
  let billingType = null;
  if (encounterType === ENCOUNTER_TYPES.IP) billingType = explicit ? chart.billingType || BILLING_TYPES.FACILITY : BILLING_TYPES.FACILITY;
  const facilityIP = encounterType === ENCOUNTER_TYPES.IP && billingType === BILLING_TYPES.FACILITY;
  return {
    encounterType,
    billingType,
    explicit,
    facilityIP,
    firstListed: firstListedClass(encounterType),
    uncertainAsConfirmed: facilityIP,
  };
};

module.exports = {
  ENCOUNTER_TYPES,
  ENCOUNTER_TYPE_LIST,
  ENCOUNTER_TYPE_LABELS,
  BILLING_TYPES,
  BILLING_TYPE_LIST,
  BILLING_TYPE_LABELS,
  DX_CLASSES,
  DX_CLASS_LIST,
  DX_CLASS_LABELS,
  firstListedClass,
  isInpatientElements,
  encounterProfile,
};

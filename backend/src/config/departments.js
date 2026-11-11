// Department groups and the code sets ("elements") a department can use.
// Labels match the frontend's ELEMENT_LABELS (EM has no label there, so the UI shows "EM").
const DEPARTMENT_GROUPS = Object.freeze({ SPECIALTY: 'specialty', SETTING: 'setting' });
const ALL_DEPARTMENT_GROUPS = Object.freeze(Object.values(DEPARTMENT_GROUPS));

const DEPARTMENT_GROUP_LABELS = Object.freeze({
  [DEPARTMENT_GROUPS.SPECIALTY]: 'Physician specialty',
  [DEPARTMENT_GROUPS.SETTING]: 'Setting / coding domain',
});

const CODE_ELEMENTS = Object.freeze({
  ICD10CM: 'ICD-10-CM',
  ICD10PCS: 'ICD-10-PCS',
  CPT: 'CPT',
  HCPCS: 'HCPCS',
  EM: 'EM',
  DRG: 'MS-DRG',
  HCC: 'HCC',
  OASIS: 'OASIS/PDGM',
  MDS: 'MDS/PDPM',
  APC: 'APC',
  REVCODE: 'Rev Codes',
  MOD: 'Modifiers',
});
const CODE_ELEMENT_KEYS = Object.freeze(Object.keys(CODE_ELEMENTS));

// Department key, e.g. CARDIO or ED_PRO. It is the document _id, so it can't change later.
const DEPARTMENT_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,19}$/;
const DEPARTMENT_LIMITS = Object.freeze({ name: 100, icon: 16 });
const DEPARTMENT_POOL_SORT_FIELDS = Object.freeze(['order', 'name', 'pool', 'allocated', 'available']);

module.exports = {
  DEPARTMENT_GROUPS,
  ALL_DEPARTMENT_GROUPS,
  DEPARTMENT_GROUP_LABELS,
  CODE_ELEMENTS,
  CODE_ELEMENT_KEYS,
  DEPARTMENT_KEY_PATTERN,
  DEPARTMENT_LIMITS,
  DEPARTMENT_POOL_SORT_FIELDS,
};

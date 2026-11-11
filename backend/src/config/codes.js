// Code Search reference data: code systems, ICD-10-CM index / tables / notes, and search limits.

// `legacyIndex` is the number the frontend's bundled code DB uses for the system (row[0]).
const CODE_SYSTEMS = Object.freeze({
  ICD10CM: 'ICD10CM',
  ICD10PCS: 'ICD10PCS',
  CPT: 'CPT',
  HCPCS: 'HCPCS',
});
const CODE_SYSTEM_LIST = Object.freeze([
  { key: CODE_SYSTEMS.ICD10CM, label: 'ICD-10-CM', legacyIndex: 0 },
  { key: CODE_SYSTEMS.ICD10PCS, label: 'ICD-10-PCS', legacyIndex: 1 },
  { key: CODE_SYSTEMS.CPT, label: 'CPT', legacyIndex: 2 },
  { key: CODE_SYSTEMS.HCPCS, label: 'HCPCS Level II', legacyIndex: 3 },
]);
const CODE_SYSTEM_KEYS = Object.freeze(CODE_SYSTEM_LIST.map((s) => s.key));
const SYSTEM_BY_LEGACY_INDEX = Object.freeze(CODE_SYSTEM_LIST.map((s) => s.key));

// Extra search filters (same as the frontend's "External cause" and "Add-on" chips).
const CODE_FILTERS = Object.freeze({ EXTERNAL_CAUSE: 'ext', ADD_ON: 'addon' });
const ALL_CODE_FILTERS = Object.freeze(Object.values(CODE_FILTERS));

// The two ICD-10-CM alphabetic indexes.
const ICD_INDEXES = Object.freeze({ MAIN: 'main', EXTERNAL: 'external' });
const ALL_ICD_INDEXES = Object.freeze(Object.values(ICD_INDEXES));
const ICD_INDEX_LABELS = Object.freeze({
  [ICD_INDEXES.MAIN]: 'ICD-10-CM Alphabetic Index',
  [ICD_INDEXES.EXTERNAL]: 'Index to External Causes',
});

// The two ICD-10-CM tables. Every row has exactly one code (or '') per column.
const ICD_TABLES = Object.freeze({ NEOPLASM: 'neo', DRUG: 'drug' });
const ALL_ICD_TABLES = Object.freeze(Object.values(ICD_TABLES));
const ICD_TABLE_META = Object.freeze({
  [ICD_TABLES.NEOPLASM]: {
    label: 'Neoplasm Table',
    columns: ['Malignant Primary', 'Malignant Secondary', 'Ca in situ', 'Benign', 'Uncertain Behavior', 'Unspecified Behavior'],
  },
  [ICD_TABLES.DRUG]: {
    label: 'Table of Drugs and Chemicals',
    columns: [
      'Poisoning, Accidental',
      'Poisoning, Self-harm',
      'Poisoning, Assault',
      'Poisoning, Undetermined',
      'Adverse Effect',
      'Underdosing',
    ],
  },
});
const ICD_TABLE_COLUMN_COUNT = 6;

// Tabular List instructional notes, in display order.
const NOTE_KINDS = Object.freeze(['inc', 'ex1', 'ex2', 'use', 'first', 'also', 'note']);
const NOTE_KIND_LABELS = Object.freeze({
  inc: 'Includes',
  ex1: 'Excludes1',
  ex2: 'Excludes2',
  use: 'Use additional code',
  first: 'Code first',
  also: 'Code also',
  note: 'Note',
});

const CODE_LIMITS = Object.freeze({
  query: { min: 2, max: 100 },
  search: { default: 80, max: 200 },
  indexBrowse: 60, // main terms shown before the user types
  indexSearch: 400,
  tableBrowse: 80,
  tableSearch: 300,
  familyStemMin: 3,
  validateMax: 200,
});

module.exports = {
  CODE_SYSTEMS,
  CODE_SYSTEM_LIST,
  CODE_SYSTEM_KEYS,
  SYSTEM_BY_LEGACY_INDEX,
  CODE_FILTERS,
  ALL_CODE_FILTERS,
  ICD_INDEXES,
  ALL_ICD_INDEXES,
  ICD_INDEX_LABELS,
  ICD_TABLES,
  ALL_ICD_TABLES,
  ICD_TABLE_META,
  ICD_TABLE_COLUMN_COUNT,
  NOTE_KINDS,
  NOTE_KIND_LABELS,
  CODE_LIMITS,
};

// Coding audit: auditors review students' submitted charts (admin assigns students to an auditor
// per department) and either agree with the automatic score or adjust it.

// Where an audit stands. A chart with no ChartAudit row (or one made for an older submission) is pending.
const AUDIT_STATUS = Object.freeze({ PENDING: 'pending', DRAFT: 'draft', COMPLETED: 'completed' });

// Auditor's decision on the automatic score.
const AUDIT_VERDICTS = Object.freeze({ AGREE: 'agree', ADJUSTED: 'adjusted' });
const AUDIT_VERDICT_LIST = Object.freeze(Object.values(AUDIT_VERDICTS));

// What the auditor found on one code (industry audit categories).
const FINDING_TYPES = Object.freeze([
  { key: 'upcoding', label: 'Upcoding — level/code higher than documented' },
  { key: 'undercoding', label: 'Undercoding — level/code lower than documented' },
  { key: 'missing', label: 'Missing code' },
  { key: 'unsupported', label: 'Code not supported by documentation' },
  { key: 'sequencing', label: 'Incorrect sequencing' },
  { key: 'modifier', label: 'Modifier missing or incorrect' },
  { key: 'linkage', label: 'Diagnosis pointer / linkage' },
  { key: 'poa', label: 'POA indicator' },
  { key: 'drg', label: 'MS-DRG' },
  { key: 'unbundling', label: 'Unbundling / NCCI' },
  { key: 'other', label: 'Other' },
]);
const FINDING_TYPE_KEYS = Object.freeze(FINDING_TYPES.map((f) => f.key));

// Submissions scoring below this are flagged "Priority" and listed first.
const AUDIT_PRIORITY_BELOW = 80;

// Audit queue tabs, in display order.
const AUDIT_QUEUE_TABS = Object.freeze([
  { key: 'pending', label: 'To audit' },
  { key: 'draft', label: 'In progress' },
  { key: 'completed', label: 'Audited' },
  { key: 'all', label: 'All' },
]);
const AUDIT_QUEUE_TAB_KEYS = Object.freeze(AUDIT_QUEUE_TABS.map((t) => t.key));

// Admin Users page → Auditors tab filters.
const AUDITOR_STATUS_FILTERS = Object.freeze([
  { key: 'all', label: 'All auditors' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'disabled', label: 'Disabled' },
]);
const AUDITOR_STATUS_KEYS = Object.freeze(AUDITOR_STATUS_FILTERS.map((f) => f.key));

// Status badges (label + colour tone) shown on the auditor pages.
const AUDIT_STATUS_LIST = Object.freeze([
  { key: AUDIT_STATUS.PENDING, label: 'To audit', tone: 'warn' },
  { key: AUDIT_STATUS.DRAFT, label: 'In progress', tone: 'info' },
  { key: AUDIT_STATUS.COMPLETED, label: 'Audited', tone: 'ok' },
]);

const AUDIT_VERDICT_OPTIONS = Object.freeze([
  { key: AUDIT_VERDICTS.AGREE, label: 'Agree', hint: 'keep the automatic score' },
  { key: AUDIT_VERDICTS.ADJUSTED, label: 'Adjust', hint: 'set the audited score' },
]);

// How answer-key rows (Chart.answerKey[].type) are grouped on the review screen.
const ANSWER_KEY_GROUPS = Object.freeze([
  { key: 'dx', label: 'Diagnoses (ICD-10-CM) — in submitted sequence', types: ['PDx', 'SDx', 'Dx'], field: 'dx' },
  { key: 'lines', label: 'Charge lines (CPT / HCPCS)', types: ['CPT', 'HCPCS'], field: 'lines' },
  { key: 'pcs', label: 'Procedures (ICD-10-PCS)', types: ['PCS'], field: 'pcs' },
  { key: 'mods', label: 'Modifiers in the answer key', types: ['MOD'], field: null },
  { key: 'drg', label: 'MS-DRG', types: ['DRG'], field: 'drg' },
]);

const AUDIT_LIMITS_CFG = Object.freeze({
  search: 100,
  defaultLimit: 10,
  maxLimit: 100,
  findings: 50,
  findingComment: 1000,
  feedback: 4000,
  code: 30,
  assignStudents: 2000,
});

module.exports = {
  AUDIT_STATUS,
  AUDIT_VERDICTS,
  AUDIT_VERDICT_LIST,
  FINDING_TYPES,
  FINDING_TYPE_KEYS,
  AUDIT_PRIORITY_BELOW,
  AUDIT_QUEUE_TABS,
  AUDIT_QUEUE_TAB_KEYS,
  AUDITOR_STATUS_FILTERS,
  AUDITOR_STATUS_KEYS,
  AUDIT_LIMITS: AUDIT_LIMITS_CFG,
  AUDIT_STATUS_LIST,
  AUDIT_VERDICT_OPTIONS,
  ANSWER_KEY_GROUPS,
};

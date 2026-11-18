// Student work queue: chart work types, per-student work status, and the option lists the
// coding workspace shows (defer reasons, transfer queues, remit codes, POA values).

// What the student is asked to do with a chart.
//   code   - new chart: code it from the documentation
//   review - charge review: the provider's charges were stopped by coding rules; fix and resubmit
//   denial - the payer denied the claim; decide (correct / appeal / write off) and work it
//   drg    - DRG validation: an inpatient abstract was pre-coded; verify and correct every code
const WORK_TYPES = Object.freeze({ CODE: 'code', REVIEW: 'review', DENIAL: 'denial', DRG: 'drg' });
const WORK_TYPE_LIST = Object.freeze(Object.values(WORK_TYPES));

// One student's state on one chart (ChartWork.status). A submitted chart also has a ChartResult.
const WORK_STATUS = Object.freeze({ IN_PROGRESS: 'in_progress', DEFERRED: 'deferred', TRANSFERRED: 'transferred', DONE: 'done' });
const WORK_STATUS_LIST = Object.freeze(Object.values(WORK_STATUS));

// Queue tabs: To do (not submitted, not deferred), Deferred, Completed (scored or transferred).
const QUEUE_TABS = Object.freeze([
  { key: 'todo', label: 'To do' },
  { key: 'deferred', label: 'Deferred' },
  { key: 'done', label: 'Completed' },
]);

// The option lists the workspace shows (defer reasons, transfer queues, remit codes, dispositions,
// MS-DRGs …) are data: they live in the `referencelists` collection (GET /reference/work-queue).
// Only the values the code itself branches on stay here.
const DENIAL_DECISIONS = Object.freeze(['correct', 'appeal', 'writeoff']);
const POA_VALUES = Object.freeze(['Y', 'N', 'U', 'W', '1']);

// Denial charge corrections get a session number from this counter, e.g. CS-000042.
const CHARGE_SESSION = Object.freeze({ counter: 'chargeSessions', prefix: 'CS-', digits: 6 });

// Physician (CDI) queries are answered by an admin from the Physician Queries page; there is no
// automatic reply. A chart's cdiResponse is only offered to the admin as a suggested answer.
const QUERY_STATUS = Object.freeze({ PENDING: 'pending', ANSWERED: 'answered' });
const ADMIN_QUERY_LIMITS = Object.freeze({ answer: 2000, search: 100, defaultLimit: 10, maxLimit: 50 });

// Admin Chart Activity page: tabs, page size, how much of each timeline is sent, note length.
// An admin closing a transferred chart judges whether the student picked the right queue.
const TRANSFER_VERDICTS = Object.freeze(['correct', 'incorrect']);
const ADMIN_WORK_TAB_KEYS =Object.freeze(['attention', 'deferred', 'transferred', 'in_progress', 'done', 'all']);
const ADMIN_WORK_LIMITS = Object.freeze({ note: 1000, search: 100, defaultLimit: 10, maxLimit: 50, activity: 30, comments: 10 });

// Size limits for an autosaved draft (the workspace state).
const WORK_LIMITS = Object.freeze({
  dx: 25,
  lines: 50,
  mods: 4,
  ptrs: 4,
  pcs: 25,
  evidence: 100,
  evidenceText: 400,
  notes: 4000,
  comment: 1000,
  code: 30,
  desc: 500,
  short: 120,
  queries: 10,
  activity: 200,
});

module.exports = {
  WORK_TYPES,
  WORK_TYPE_LIST,
  WORK_STATUS,
  WORK_STATUS_LIST,
  QUEUE_TABS,
  DENIAL_DECISIONS,
  POA_VALUES,
  CHARGE_SESSION,
  QUERY_STATUS,
  ADMIN_QUERY_LIMITS,
  ADMIN_WORK_TAB_KEYS,
  TRANSFER_VERDICTS,
  ADMIN_WORK_LIMITS,
  WORK_LIMITS,
};

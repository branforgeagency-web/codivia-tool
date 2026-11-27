/* Every activity tab of the workspace, in the order shown (same order as the reference EHR).
   Coding is done in the right panel's Coding tab (sidebar/SidePanel.jsx), next to whatever is open;
   only denial charts keep a "Denial Work" activity for the claim, remit and account history.
   To add a tab: add it here, write its component in this folder and map its key in WorkspacePage
   (`views`). `when(chart)` hides a tab for charts it does not apply to. */
export const ACTIVITIES = [
  { key: 'review', label: 'Chart Review', icon: 'bi-journal-medical', big: true },
  { key: 'episode', label: 'Episode', icon: 'bi-collection', big: true },
  { key: 'notes', label: 'Notes', icon: 'bi-file-earmark-text', big: true },
  { key: 'treat', label: 'Treatments', icon: 'bi-capsule' },
  {
    key: 'coding',
    label: 'Denial Work',
    icon: 'bi-receipt',
    big: true,
    when: (chart) => chart.workType === 'denial',
  },
  {
    key: 'wrap',
    label: 'Wrap-Up',
    icon: 'bi-check2-square',
    big: true,
    hint: 'Visit diagnoses, charge capture, claim edits and submit',
  },
  { key: 'iq', label: 'PatientIQ', icon: 'bi-ui-checks' },
  { key: 'msg', label: 'Patient Message', icon: 'bi-envelope' },
  { key: 'demo', label: 'Demographics', icon: 'bi-person-lines-fill' },
  { key: 'flow', label: 'Flowsheets', icon: 'bi-activity' },
  { key: 'synopsis', label: 'Synopsis', icon: 'bi-clipboard-data' },
];

export const FIRST_ACTIVITY = ACTIVITIES[0].key;
// Activities shown without the right panel (none today: the panel holds the coding).
export const NO_SIDEBAR = [];

// The tabs for this chart, with live extras from the page: { key: { label?, count?, tone? } }.
export const activityTabs = (chart, extras = {}) =>
  ACTIVITIES.filter((a) => !a.when || a.when(chart)).map((a) => ({
    ...a,
    ...(extras[a.key] || {}),
  }));

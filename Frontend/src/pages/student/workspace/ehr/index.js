/* CODIVIA EHR shell for the coding workspace (layout like a hospital EHR). Import from here.
 *
 *   shell/         SystemBar, PatientTabs, Storyboard (left), ActivityTabs, BottomBar
 *   activities/    one file per activity tab + registry.js (the tab list and order)
 *   chart-review/  ChartReview + chartReviewData (record tabs, columns, quick filters, rows)
 *   sidebar/       SidePanel (Coding · Reports · Visit Report · To Do) and one file per report
 *   ui/            shared pieces: ActivityHeader, Card, KvTable, EhrTable, Note, QueryList, ReportView …
 *   lib/           pure helpers: names, visit sections, vitals, medications, dates
 *   ehr.css        all shell styles (scoped to .wsx.ehr)
 *
 * Exports are listed by name (not `export *`) so a missing or duplicate name fails loudly here.
 * The flat files left in this folder (Activities.jsx, MoreActivities.jsx, EhrShell.jsx, SidePanel.jsx,
 * ChartReview.jsx, chartReviewData.js, ReportView.jsx) are old copies and not used.
 */
import './ehr.css';

export { ActivityTabs, BottomBar, PatientTabs, Storyboard, SystemBar } from './shell/index.js';
export {
  ACTIVITIES,
  activityTabs,
  Demographics,
  Episode,
  FIRST_ACTIVITY,
  Flowsheets,
  NO_SIDEBAR,
  NotesActivity,
  PatientIQ,
  PatientMessage,
  Synopsis,
  Treatments,
  WrapUp,
} from './activities/index.js';
export {
  ChartReview,
  chartReviewRows,
  CR_FILTERS,
  CR_TABS,
  parseDate,
  rowText,
  timeGroup,
  typeIcon,
} from './chart-review/index.js';
export {
  ClinicalReport,
  MedHxReport,
  RegulatoryReport,
  pinKey,
  SIDE_TABS,
  SidePanel,
  ToDo,
  todoTasks,
  VisitReport,
} from './sidebar/index.js';
export {
  ActivityHeader,
  Card,
  CardGrid,
  EhrButton,
  EhrTable,
  KvTable,
  NoData,
  Note,
  QueryList,
  ReportView,
  SideCard,
  StepStack,
} from './ui/index.js';
export {
  asOf,
  displayName,
  hasValue,
  initials,
  isAlertAllergy,
  medsOf,
  patientInitials,
  sectionsMatching,
  sectionsText,
  sexLabel,
  visitSections,
  VITAL_LIST,
  vitalsOf,
} from './lib/chartText.js';
export { useDragSize, useDragWidth } from './lib/useDragWidth.js';
export { medChangesOf, visitModel } from './lib/visitModel.js';

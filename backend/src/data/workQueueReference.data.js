// Seed data for the reference lists the coding workspace and the admin upload use
// (npm run seed:reference). Stored in the `referencelists` collection and served by
// GET /reference/work-queue, so nothing here is copied into the frontend.
//
// Each list: { _id: key, label, order, items: [{ value, label, code?, desc?, meta? }] }
module.exports = [
  {
    _id: 'workTypes',
    label: 'Work types',
    items: [
      { value: 'code', label: 'New chart', desc: 'Code from the documentation', meta: { action: 'Code it', panel: 'Coding', tone: 'navy', badge: 'Code from the record' } },
      { value: 'review', label: 'Charge review', desc: 'Fix the provider’s charges', meta: { action: 'Review', panel: 'Charge review', tone: 'brand', badge: 'Stopped by rules' } },
      { value: 'denial', label: 'Denial', desc: 'Payer denied the claim', meta: { action: 'Work denial', panel: 'Work this denial', tone: 'err', badge: 'Denied claim' } },
      { value: 'drg', label: 'DRG validation', desc: 'Check the pre-coded abstract', meta: { action: 'Validate', panel: 'DRG validation', tone: 'brand', badge: 'Pre-coded — verify every code', inpatientOnly: true } },
    ],
  },
  {
    _id: 'poa',
    label: 'Present on admission',
    items: [
      { value: 'Y', label: 'Y – yes' },
      { value: 'N', label: 'N – no' },
      { value: 'U', label: 'U – unknown' },
      { value: 'W', label: 'W – clinically undetermined' },
      { value: '1', label: '1 – exempt' },
    ],
  },
  {
    _id: 'admitTypes',
    label: 'Admission type (UB-04 FL 14)',
    items: ['1 · Emergency', '2 · Urgent', '3 · Elective', '4 · Newborn', '5 · Trauma'].map((v) => ({ value: v, label: v })),
  },
  {
    _id: 'admitSources',
    label: 'Point of origin (UB-04 FL 15)',
    items: ['1 · Non-health care facility', '2 · Clinic or physician referral', '4 · Transfer from hospital', '5 · Transfer from SNF', '7 · Emergency room'].map((v) => ({ value: v, label: v })),
  },
  {
    _id: 'dispositions',
    label: 'Discharge disposition (UB-04 FL 17)',
    items: ['01 · Home / self-care', '02 · Short-term hospital', '03 · SNF', '06 · Home health', '07 · Left against medical advice', '20 · Expired', '50 · Hospice — home', '62 · Inpatient rehab'].map((v) => ({ value: v, label: v })),
  },
  {
    _id: 'emLevels',
    label: 'E/M levels (code, MDM, time threshold in minutes)',
    items: [
      ...[['99202', 'Straightforward', 15], ['99203', 'Low', 30], ['99204', 'Moderate', 45], ['99205', 'High', 60]].map(([c, m, t]) => ({ value: c, label: m, meta: { grid: 'new', minutes: t } })),
      ...[['99211', 'Minimal', 0], ['99212', 'Straightforward', 10], ['99213', 'Low', 20], ['99214', 'Moderate', 30], ['99215', 'High', 40]].map(([c, m, t]) => ({ value: c, label: m, meta: { grid: 'est', minutes: t } })),
      ...[['99281', 'Minimal'], ['99282', 'Straightforward'], ['99283', 'Low'], ['99284', 'Moderate'], ['99285', 'High']].map(([c, m]) => ({ value: c, label: m, meta: { grid: 'ed', minutes: 0 } })),
    ],
  },
  {
    _id: 'emGrids',
    label: 'E/M patient types',
    items: [
      { value: 'new', label: 'New' },
      { value: 'est', label: 'Established' },
      { value: 'ed', label: 'Emergency' },
    ],
  },
  {
    _id: 'modifiers',
    label: 'CPT / HCPCS modifiers',
    items: [
      ['25', 'Significant, separately identifiable E/M same day'], ['59', 'Distinct procedural service'], ['51', 'Multiple procedures'],
      ['50', 'Bilateral procedure'], ['RT', 'Right side'], ['LT', 'Left side'], ['76', 'Repeat procedure, same physician'],
      ['77', 'Repeat procedure, another physician'], ['26', 'Professional component'], ['TC', 'Technical component'],
      ['24', 'Unrelated E/M during postop period'], ['57', 'Decision for surgery'], ['58', 'Staged/related procedure in postop period'],
      ['78', 'Return to OR for related procedure'], ['79', 'Unrelated procedure in postop period'], ['91', 'Repeat clinical diagnostic lab test'],
      ['GA', 'Waiver of liability on file (ABN)'], ['XS', 'Separate structure'], ['XE', 'Separate encounter'], ['XU', 'Unusual non-overlapping service'],
      ['95', 'Synchronous telemedicine, audio-video'], ['93', 'Synchronous telemedicine, audio only'], ['JW', 'Drug amount discarded'], ['JZ', 'Zero drug amount discarded'],
    ].map(([v, l]) => ({ value: v, label: l })),
  },
  {
    _id: 'drgs',
    label: 'MS-DRG',
    items: [
      ['871', 'Septicemia w/o MV >96hr w MCC'], ['872', 'Septicemia w/o MV >96hr w/o MCC'], ['291', 'Heart failure & shock w MCC'],
      ['292', 'Heart failure & shock w CC'], ['293', 'Heart failure & shock w/o CC/MCC'], ['193', 'Simple pneumonia & pleurisy w MCC'],
      ['194', 'Simple pneumonia & pleurisy w CC'], ['195', 'Simple pneumonia & pleurisy w/o CC/MCC'], ['189', 'Pulmonary edema & respiratory failure'],
      ['190', 'COPD w MCC'], ['191', 'COPD w CC'], ['192', 'COPD w/o CC/MCC'], ['377', 'GI hemorrhage w MCC'], ['378', 'GI hemorrhage w CC'],
      ['379', 'GI hemorrhage w/o CC/MCC'], ['338', 'Appendectomy w complicated principal dx w MCC'], ['339', 'Appendectomy w complicated principal dx w CC'],
      ['343', 'Appendectomy w/o complicated principal dx w/o CC/MCC'], ['417', 'Laparoscopic cholecystectomy w/o CDE w MCC'],
      ['418', 'Laparoscopic cholecystectomy w/o CDE w CC'], ['419', 'Laparoscopic cholecystectomy w/o CDE w/o CC/MCC'],
      ['480', 'Hip & femur procedures except major joint w MCC'], ['481', 'Hip & femur procedures except major joint w CC'],
      ['482', 'Hip & femur procedures except major joint w/o CC/MCC'], ['469', 'Major hip & knee joint replacement w MCC'],
      ['470', 'Major hip & knee joint replacement w/o MCC'], ['061', 'Ischemic stroke w use of thrombolytic w MCC'],
      ['064', 'Intracranial hemorrhage or cerebral infarction w MCC'], ['066', 'Intracranial hemorrhage or cerebral infarction w/o CC/MCC'],
      ['637', 'Diabetes w MCC'], ['638', 'Diabetes w CC'], ['639', 'Diabetes w/o CC/MCC'], ['682', 'Renal failure w MCC'],
      ['683', 'Renal failure w CC'], ['684', 'Renal failure w/o CC/MCC'],
    ].map(([v, l]) => ({ value: v, label: l })),
  },
  {
    _id: 'remitCodes',
    label: 'Claim adjustment reason codes',
    items: [
      { value: 'CO-4', label: 'CO-4', desc: 'The procedure code is inconsistent with the modifier used.' },
      { value: 'CO-11', label: 'CO-11', desc: 'The diagnosis is inconsistent with the procedure.' },
      { value: 'CO-16', label: 'CO-16', desc: 'Claim/service lacks information or has submission/billing error(s).' },
      { value: 'CO-50', label: 'CO-50', desc: 'These are non-covered services because this is not deemed a medical necessity by the payer.' },
      { value: 'CO-97', label: 'CO-97', desc: 'Payment is included in the allowance for another service/procedure already adjudicated.', meta: { informational: true } },
      { value: 'PI-4', label: 'PI-4', desc: 'The procedure code is inconsistent with the modifier used (payer-initiated reduction).' },
    ],
  },
  {
    _id: 'denialDecisions',
    label: 'Denial decisions',
    items: [
      { value: 'correct', label: 'Correct & resubmit', desc: 'Our billing error — fix the charge and send a corrected claim.' },
      { value: 'appeal', label: 'Appeal', desc: 'The claim was right; ask the payer to reconsider with records.' },
      { value: 'writeoff', label: 'Write off', desc: 'Not collectable — adjust the balance off.' },
    ],
  },
  {
    _id: 'deferReasons',
    label: 'Defer reasons',
    items: [
      { value: 'Following up with provider', label: 'Following up with provider', code: '98002' },
      { value: 'Waiting for information', label: 'Waiting for information', code: '98000' },
      { value: 'Pending review', label: 'Pending review', code: '1000' },
      { value: 'Research needed', label: 'Research needed', code: '1002' },
      { value: 'Waiting for supervisor response', label: 'Waiting for supervisor response', code: '98001' },
      { value: 'Other', label: 'Other', code: '1003' },
    ],
  },
  {
    _id: 'transferQueues',
    label: 'Transfer work queues',
    items: ['PB Back End Billing', 'Provider Query (clarification)', 'Front End Registration', 'Charge Entry Corrections', 'HIM Coding Supervisor'].map((v) => ({ value: v, label: v })),
  },
  {
    _id: 'transferReasons',
    label: 'Transfer reasons',
    items: ['Incorrect review assignment', 'Not a billable encounter', 'Documentation unclear — needs provider', 'Registration / coverage issue'].map((v) => ({ value: v, label: v })),
  },
  {
    _id: 'queryOptions',
    label: 'Standard physician query options',
    items: ['Other (please specify)', 'Unable to determine'].map((v) => ({ value: v, label: v })),
  },
].map((list, i) => ({ order: i, ...list }));

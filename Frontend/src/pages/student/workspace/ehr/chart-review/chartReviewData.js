/* CODIVIA EHR shell — Chart Review rows built from the chart (no extra API).
   Sources: the chart's documents (uploaded documents, or the record split into groups), answered
   physician queries and chart.previousRecords (earlier encounters). Each row: { id, tab, when, date,
   cells, sections, doc?, prev?, current }. Assumptions (no source data for them):
   - a document's tab comes from its title (lab / imaging / procedure / medication words; else Notes);
   - "Abnormal" = the text has an abnormal-result word (abnormal, positive, elevated, high, low …);
   - current-visit documents are dated with the encounter's date of service (or admit date). */
import { parseRecordSections } from '../../recordSections.js';
import { VITAL_LIST, vitalsOf } from '../lib/chartText.js';

const ED_WORDS = /emergency|\bED\b|\bER\b/;
// A Media file shown as a picture (else it opens as a PDF / document).
export const isImage = (f) =>
  /^image\//.test((f && f.mimeType) || '') || /\.(png|jpe?g|gif|webp)$/i.test((f && f.name) || '');
// Minutes between two times ("07:42", "03/10/2026 09:17"); past midnight counts on. null if unknown.
export const minutesBetween = (a, b) => {
  const t = (s) => {
    const m = String(s || '').match(/(\d{1,2}):(\d{2})(?!.*\d{1,2}:\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const x = t(a);
  const y = t(b);
  if (x === null || y === null) return null;
  return (y - x + 1440) % 1440;
};
const isDxCode = (c) => /dx/i.test(c.type || '') || /^[A-Z]\d/.test(c.code || '');

// Chart Review sub-tabs and their columns. Tabs without rows still show ("No records found").
// color = the thin line over the tab name.
const DOC_COLS = [
  ['when', 'Date'],
  ['type', 'Type'],
  ['desc', 'Description'],
  ['author', 'Author'],
  ['status', 'Status'],
];
export const CR_TABS = [
  {
    key: 'enc',
    label: 'Encounters',
    cols: [
      ['when', 'When'],
      ['type', 'Type', 'icon'],
      ['with', 'With'],
      ['desc', 'Description'],
      ['cc', 'Chief Complaint / Reason'],
      ['disch', 'Disch Date'],
      ['dept', 'Dept'],
    ],
  },
  {
    key: 'notes',
    label: 'Notes/Trans',
    cols: [
      ['encDate', 'Encounter Date'],
      ['when', 'Note Date'],
      ['etype', 'Encounter Type', 'icon'],
      ['type', 'Type'],
      ['desc', 'Title'],
      ['author', 'Author'],
      ['dept', 'Dept.'],
      ['status', 'Status'],
      ['spec', 'Specialty'],
    ],
  },
  {
    key: 'letters',
    label: 'Letters',
    cols: [
      ['when', 'Date'],
      ['type', 'Letter Type'],
      ['desc', 'Description'],
      ['author', 'From'],
      ['to', 'To'],
      ['status', 'Status'],
    ],
  },
  {
    key: 'ed',
    label: 'ED Visits',
    color: '#c0281b',
    cols: [
      ['when', 'Arrival'],
      ['departure', 'Departure'],
      ['cc', 'Chief Complaint'],
      ['acuity', 'Acuity'],
      ['dx', 'ED Diagnoses'],
      ['disp', 'Disposition'],
      ['with', 'Provider'],
      ['dept', 'Dept'],
    ],
  },
  {
    key: 'anes',
    label: 'Anes',
    cols: [
      ['when', 'Date'],
      ['desc', 'Procedure'],
      ['type', 'Anesthesia Type'],
      ['asa', 'ASA'],
      ['start', 'Start'],
      ['stop', 'Stop'],
      ['dur', 'Duration'],
      ['author', 'Anesthesia Provider'],
    ],
  },
  {
    key: 'proc',
    label: 'Proc',
    cols: [
      ['when', 'Date'],
      ['desc', 'Procedure'],
      ['author', 'Performed By'],
      ['type', 'Type'],
      ['status', 'Status'],
    ],
  },
  {
    key: 'card',
    label: 'Card',
    cols: [
      ['when', 'Date'],
      ['desc', 'Study'],
      ['interp', 'Interpretation'],
      ['abn', 'Abnormal?'],
      ['status', 'Status'],
      ['author', 'Read By'],
    ],
  },
  {
    key: 'labs',
    label: 'Labs',
    color: '#e2c400',
    cols: [
      ['when', 'Collected'],
      ['desc', 'Test'],
      ['value', 'Value'],
      ['units', 'Units'],
      ['range', 'Ref Range'],
      ['abn', 'Flag'],
      ['status', 'Status'],
      ['author', 'Auth Prov'],
    ],
  },
  {
    key: 'rad',
    label: 'Rad',
    color: '#2a5ea8',
    cols: [
      ['when', 'Ordered Date'],
      ['examEnd', 'End Exam Date'],
      ['signed', 'Signed Date/Time'],
      ['extPlace', 'Ext Result Place'],
      ['desc', 'Procedure'],
      ['docDesc', 'Doc Description'],
      ['status', 'Status'],
      ['author', 'Auth Prov'],
    ],
    // Imaging toolbar. Coders have no image viewer and don't order, so these are shown disabled.
    tools: [
      ['bi-images', 'Patient Images'],
      ['bi-box-arrow-up-right', 'External Image Exchange'],
      ['bi-archive', 'Image Archive'],
      ['bi-arrow-repeat', 'Order Again'],
    ],
    compactFilters: true,
    preview: 'right', // the preview opens beside the list (the reader can switch it below)
  },
  {
    key: 'meds',
    label: 'Meds',
    color: '#1f2f6b',
    cols: [
      ['when', 'Start'],
      ['desc', 'Medication'],
      ['dose', 'Dose'],
      ['route', 'Route'],
      ['freq', 'Frequency'],
      ['author', 'Prescriber'],
      ['status', 'Status'],
      ['end', 'End'],
    ],
  },
  {
    key: 'referrals',
    label: 'Referrals',
    cols: [
      ['when', 'Date'],
      ['type', 'Rfl type'],
      ['rclass', 'RFL Class'],
      ['refId', 'Referral Id'],
      ['desc', 'Procedure'],
      ['status', 'Status'],
    ],
  },
  {
    key: 'media',
    label: 'Media',
    color: '#2a9d5c',
    preview: 'right', // scans and photos need room: the viewer opens beside the list
    cols: [
      ['when', 'Date'],
      ['desc', 'Document'],
      ['att', 'File', 'icon'],
      ['type', 'Type'],
      ['author', 'From'],
    ],
  },
  {
    key: 'orders',
    label: 'Other Orders',
    cols: [
      ['when', 'Date'],
      ['desc', 'Order'],
      ['type', 'Order Type'],
      ['status', 'Status'],
      ['author', 'Ordered By'],
    ],
  },
  {
    key: 'episodes',
    label: 'Episodes',
    cols: [
      ['desc', 'Episode'],
      ['type', 'Type'],
      ['status', 'Status'],
      ['when', 'Start Date'],
      ['end', 'End Date'],
      ['with', 'Responsible Provider'],
      ['visits', 'Encounters'],
    ],
  },
  {
    key: 'ldas',
    label: 'LDAs',
    cols: [
      ['when', 'Inserted'],
      ['desc', 'Device'],
      ['site', 'Site'],
      ['removed', 'Removed'],
      ['status', 'Status'],
    ],
  },
];

// Most specific first: a title is put in the first tab whose words it has.
const TAB_OF_TITLE = [
  // Correspondence: letters, certificates, approvals, authorizations, clearances.
  [
    'letters',
    /\bletter|correspondence|certificate|clearance|approval|authori[sz]ation|notification/i,
  ],
  // (ED Visits lists emergency visits, not documents: ED notes go to Notes/Trans.)
  ['anes', /anesth|anaesth/i],
  ['card', /cardio|\bekg\b|\becg\b|echo|stress test|holter/i],
  ['labs', /\blab|patholog|specimen|blood work|biopsy|cytolog|urinalysis|culture/i],
  [
    'rad',
    /radiolog|imaging|x-?ray|\bxr\b|\bct\b|\bmri\b|ultrasound|sonogra|mammogra|\bpet\b|dexa|\bdxa\b|fluoro|doppler|diagnostic/i,
  ],
  ['proc', /operative|\bop note|procedure|surgical|surgery/i],
  ['meds', /medication|\bmeds?\b|prescription|\brx\b/i],
  ['referrals', /referral|consult/i],
  ['ldas', /\blda\b|catheter|drain|airway|central line|\bpicc\b/i],
  ['orders', /\border/i],
  ['media', /scan|attachment|media|photo/i],
];
const TYPE_ICON = {
  'Office Visit': 'bi-person',
  'Hospital Encounter': 'bi-hospital',
  'Query Response': 'bi-chat-left-text',
  'Progress Notes': 'bi-file-earmark-text',
  Episode: 'bi-collection',
  Image: 'bi-image', // Media files
  PDF: 'bi-file-earmark-pdf',
};
export const typeIcon = (t) =>
  TYPE_ICON[t] ||
  (/letter/i.test(t)
    ? 'bi-envelope'
    : /e-?visit|tele/i.test(t)
      ? 'bi-chat-dots'
      : 'bi-file-earmark');

const RFL_TYPES = [
  ['Radiology Services', /x-?ray|\bct\b|\bmri\b|ultrasound|imaging|mammo|\bus\b/i],
  ['Lab Services', /\blab|blood test|culture/i],
  ['Physical Therapy', /physical therapy|\bpt\b|rehab/i],
  ['Consult, Test and Treat', /./],
];
// "Refer to pulmonology for follow-up" → "Pulmonology"; "Cardiology consult" → "Cardiology".
const titleWords = (s) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
export function referredTo(text) {
  const m =
    String(text).match(
      /\brefer(?:red|ral|s)?\s+(?:to|for)\s+(?:an?\s+|the\s+)?([a-z][a-z &/-]*?)(?=\s+(?:for|clinic|department|service|evaluation|follow|consult|referral)\b|[.,;:]|$)/i,
    ) || String(text).match(/^([a-z][a-z &/-]*?)\s+(?:consult|consultation|referral)\b/i);
  return m ? titleWords(m[1].trim()) : '';
}
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

const refId = (text) => {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 90000000;
  return String(10000000 + h);
};

// The order behind an imaging row (shown in the Rad preview). The chart has no order data, so the
// ordering / authorizing / signing provider is the visit's provider and the order # is stable
// from the text.
const imagingOf = ({ title, provider, date, key }) => ({
  orderId: refId(key + title),
  status: 'Final result',
  priority: 'Routine',
  orderDate: date,
  signedBy: provider,
  orderedBy: provider,
  authorizedBy: provider,
});

// Quick filters per tab (checkboxes in the filter bar). only = show the rows that match any checked
// "only" filter; hide = drop the rows that match.
const noteIs = (re) => (r) => re.test(r.cells.type + ' ' + r.cells.desc);
export const CR_FILTERS = {
  enc: [
    {
      key: 'visits',
      label: 'Visits',
      mode: 'only',
      test: (r) => r.cells.type !== 'Hospital Encounter',
    },
    {
      key: 'admissions',
      label: 'Admissions',
      mode: 'only',
      test: (r) => r.cells.type === 'Hospital Encounter',
    },
  ],
  notes: [
    {
      key: 'deleted',
      label: 'Hide Deleted',
      mode: 'hide',
      test: (r) => /deleted/i.test(r.cells.status),
    },
    { key: 'proc', label: 'Procedures', mode: 'only', test: noteIs(/procedure|operative/i) },
    { key: 'hp', label: 'H&P', mode: 'only', test: noteIs(/h&p|history and physical/i) },
    { key: 'dc', label: 'DC Summary', mode: 'only', test: noteIs(/discharge summary|dc summary/i) },
    {
      key: 'op',
      label: 'OP Visit',
      mode: 'only',
      test: (r) => r.cells.etype !== 'Hospital Encounter',
    },
  ],
  referrals: [
    {
      key: 'denied',
      label: 'Hide Denied',
      mode: 'hide',
      test: (r) => /denied/i.test(r.cells.status),
    },
  ],
  labs: [{ key: 'abn', label: 'Abnormal', mode: 'only', test: (r) => !!r.cells.abn }],
  // Cardiology: abnormal, then one box per kind of study (from its name).
  card: [
    { key: 'abn', label: 'Abnormal', mode: 'only', test: (r) => !!r.cells.abn },
    ...[
      ['ekg', 'EKG', /\b(ekg|ecg|electrocardiogra)/i],
      ['echo', 'Echo', /echo/i],
      ['stress', 'Stress', /stress/i],
      ['monitor', 'Holter/Monitor', /holter|event monitor|monitor|zio/i],
      ['cath', 'Cath', /cath|angiogra|\bpci\b/i],
      ['device', 'Device', /pacemaker|\bicd\b|device|interrogat/i],
    ].map(([key, label, re]) => ({
      key,
      label,
      mode: 'only',
      test: (r) => re.test(r.cells.desc || ''),
    })),
  ],
  meds: [
    { key: 'active', label: 'Active', mode: 'only', test: (r) => /active/i.test(r.cells.status) },
    {
      key: 'disc',
      label: 'Hide Discontinued',
      mode: 'hide',
      test: (r) => /discontinu|stopped|inactive|completed/i.test(r.cells.status),
    },
  ],
  orders: [
    {
      key: 'canceled',
      label: 'Hide Canceled',
      mode: 'hide',
      default: true,
      test: (r) => /cancel/i.test(r.cells.status),
    },
    {
      key: 'done',
      label: 'Completed',
      mode: 'only',
      test: (r) => /complet|done|resulted/i.test(r.cells.status),
    },
  ],
  ldas: [
    {
      key: 'active',
      label: 'Active Only',
      mode: 'only',
      test: (r) => !r.cells.removed && !/removed/i.test(r.cells.status),
    },
  ],
  // ED Visits: by disposition.
  ed: [
    ['admitted', 'Admitted', /admit/i],
    ['discharged', 'Discharged', /discharg|home/i],
    ['transferred', 'Transferred', /transfer/i],
    ['left', 'Left / AMA', /\bAMA\b|against medical|left without|\blwbs\b|elope/i],
  ].map(([key, label, re]) => ({
    key,
    label,
    mode: 'only',
    test: (r) =>
      re.test(r.cells.disp || '') && !(key === 'discharged' && /admit/i.test(r.cells.disp)),
  })),
  episodes: [
    {
      key: 'resolved',
      label: 'Hide Resolved',
      mode: 'hide',
      test: (r) => /resolved/i.test(r.cells.status),
    },
  ],
  // Imaging: hide canceled orders (on by default), then one box per modality, read from the
  // procedure name.
  rad: [
    {
      key: 'canceled',
      label: 'Hide Canceled Orders',
      mode: 'hide',
      default: true,
      test: (r) => /cancel/i.test(r.cells.status),
    },
    { key: 'final', label: 'Final', mode: 'only', test: (r) => /final/i.test(r.cells.status) },
    ...[
      ['us', 'US', /ultrasound|sonogra|\bUS\b|\bduplex\b/i],
      ['ct', 'CT', /\bCTA?\b|computed tomograph/i],
      ['mr', 'MR', /\bMR[IA]?\b|magnetic resonance/i],
      ['xr', 'XR', /x-?ray|\bXR\b|radiograph|\bviews?\b/i],
      ['vsc', 'VSC', /vascular|doppler|venous|arterial|duplex/i],
      ['bd', 'BD', /bone density|\bdexa\b|\bdxa\b/i],
      ['breast', 'Breast', /breast|mammo/i],
      ['nm', 'NM', /nuclear|\bNM\b|scintigra|bone scan|\bhida\b|thyroid uptake/i],
      ['pet', 'PET', /\bPET\b/],
      ['fl', 'FL', /fluoro|barium|swallow study|\bFL\b/i],
      ['pocus', 'POCUS', /\bpocus\b|point[- ]of[- ]care ultrasound|bedside ultrasound/i],
    ].map(([key, label, re]) => ({
      key,
      label,
      mode: 'only',
      test: (r) => re.test(r.cells.desc + ' ' + (r.cells.docDesc || '')),
    })),
  ],
};

const RESULT_TABS = ['labs', 'rad', 'card', 'meds', 'letters', 'media'];
// The tab of a note with a type (NOTE block / earlier visit's Note Type). The type decides:
// H&P, Consult, Operative Report … are clinical notes (Notes/Trans) whatever the title says
// ("Cardiology consult" is a note, not a cardiology study); results and letters go to their tab.
// A generic type ("Report", "Result") lets the title decide.
const noteTabOf = (type, title) => {
  const byType = tabOf(type);
  if (RESULT_TABS.includes(byType)) return byType;
  if (/^(report|result|study|document|other)s?$/i.test(String(type).trim())) {
    const byTitle = tabOf(title);
    return RESULT_TABS.includes(byTitle) ? byTitle : 'notes';
  }
  return 'notes';
};
const tabOf = (title) => (TAB_OF_TITLE.find(([, re]) => re.test(title)) || ['notes'])[0];
const ABNORMAL =
  /\babnormal|\bpositive\b|elevated|\bhigh\b|\blow\b|critical|\(H\)|\(L\)|\bmass\b|fracture|opacity|effusion/i;

// "09/23/2026", "2026-09-23" → Date (local), or null.
export function parseDate(s) {
  const m = String(s || '').match(/(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})/);
  if (!m) return null;
  const [a, b, c] = m.slice(1).map(Number);
  const d = a > 31 ? new Date(a, b - 1, c) : new Date(c < 100 ? 2000 + c : c, a - 1, b);
  return Number.isNaN(d.getTime()) ? null : d;
}

// The time group of a row, against the visit date: This Visit, Recent, 6 Months Ago, 1 Year Ago …
export function timeGroup(date, visit, current) {
  if (current) return 'This Visit';
  if (!date) return 'Unknown Date';
  if (!visit) return 'Earlier';
  const days = Math.round((visit - date) / 86400000);
  if (days < 183) return 'Recent';
  if (days < 365) return '6 Months Ago';
  const y = Math.floor(days / 365);
  return y === 1 ? '1 Year Ago' : y + ' Years Ago';
}

const bodyOf = (sections) => sections.map((s) => s.body || '').join('\n');
const firstLine = (sections) =>
  (
    bodyOf(sections)
      .split('\n')
      .find((l) => l.trim()) || ''
  ).trim();

export function chartReviewRows(chart, docs) {
  const e = chart.encounter || {};
  const visitText = e.dos || e.admit || '';
  const visit = parseDate(visitText);
  const provider = e.provider || '';
  const etype =
    e.visitType || (chart.encounterType === 'IP' ? 'Hospital Encounter' : 'Office Visit');
  const rows = [];
  const plain = !(chart.documents && chart.documents.length);

  // Current encounter: the visit reason is the chief complaint (never the chart title — it names the diagnosis).
  const cc = docs.find((d) => /chief complaint|reason for visit/i.test(d.title));
  const ccSec = docs
    .flatMap((d) => d.sections)
    .find((s) => /CHIEF COMPLAINT|REASON FOR/i.test(s.head));
  rows.push({
    id: 'enc-current',
    tab: 'enc',
    current: true,
    episode: e.episode || '', // the episode of care this visit belongs to (by name)
    date: visit,
    when: visitText,
    sections: (docs.find((d) => d.key === 'full') || docs[0] || { sections: [] }).sections,
    doc: (docs.find((d) => d.key === 'full') || docs[0] || {}).key,
    cells: {
      type: etype,
      with: provider,
      desc:
        (e.visitType || etype) +
        (e.ptype === 'new' ? ' · New patient' : e.ptype === 'est' ? ' · Established' : ''),
      cc: (ccSec && firstLine([ccSec])) || (cc && firstLine(cc.sections)) || '',
      disch: e.discharge || '',
      dept: e.facility || chart.deptName || '',
    },
  });

  // Current documents. Plain charts: the whole record is the visit note; the record's lab, imaging,
  // procedure and medication groups are also listed under their own tab, one row per section.
  docs.forEach((d) => {
    const isGroup = plain && d.key !== 'full' && !d.isQuery;
    const tab = d.isQuery ? 'notes' : d.type ? noteTabOf(d.type, d.title) : tabOf(d.title);
    if (isGroup && tab === 'notes') return; // CC, HPI, Exam … are parts of the visit note
    const list = isGroup
      ? d.sections.map((s, i) => ({
          id: d.key + '-' + i,
          title: s.head === 'RECORD' ? d.title : s.head,
          sections: [s],
        }))
      : [{ id: d.key, title: d.key === 'full' ? 'Progress Note' : d.title, sections: d.sections }];
    list.forEach((x) =>
      rows.push({
        id: 'doc-' + x.id,
        tab,
        current: true,
        date: parseDate(d.date) || visit,
        when: d.isQuery ? (d.sub || '').split(' · ')[0] : d.date || visitText,
        sections: x.sections,
        doc: d.key,
        imaging:
          tab === 'rad' && !d.isQuery
            ? imagingOf({ title: x.title, provider, date: visitText, key: String(chart.id) })
            : undefined,
        cells: {
          type: d.isQuery
            ? 'Query Response'
            : d.type || (d.key === 'full' ? 'Progress Notes' : d.sub || 'Note'),
          desc: x.title,
          author: d.isQuery ? (d.sub || '').split(' · ')[1] || '' : d.author || provider,
          status: d.isQuery
            ? 'Answered'
            : d.status ||
              (['labs', 'rad', 'card'].includes(tab)
                ? 'Final result'
                : tab === 'letters'
                  ? 'Sent'
                  : 'Signed'),
          to: d.recipient || '', // letters
          abn:
            ['labs', 'rad', 'card'].includes(tab) && ABNORMAL.test(bodyOf(x.sections))
              ? 'Abnormal'
              : '',
          // Imaging: a resulted study is done and signed on the visit date.
          examEnd: tab === 'rad' && !d.isQuery ? visitText : '',
          signed: tab === 'rad' && !d.isQuery ? visitText : '',
          etype,
          encDate: visitText,
          dept: e.facility || chart.deptName || '',
          // The note's own specialty; a note by another author does not take the visit's.
          spec: d.specialty || (d.author && d.author !== provider ? '' : e.specialty || ''),
        },
      }),
    );
  });
  // Letters: the preview shows the letter's header (type, date, from, to, status) above its text.
  rows
    .filter((r) => r.tab === 'letters' && r.current)
    .forEach((r) => {
      r.sourceTitle = 'Letter';
      r.detail = [
        {
          title: '',
          rows: [
            ['Letter Type', r.cells.type],
            ['Description', r.cells.desc],
            ['Date', r.when],
            ['From', r.cells.author],
            ['To', r.cells.to],
            ['Status', r.cells.status],
          ],
        },
      ];
    });

  // Earlier encounters: one Encounters row each (with their codes, like "Needs flu shot (Primary Dx) [Z23]"),
  // plus a Notes row for the record itself.
  (chart.previousRecords || []).forEach((r, i) => {
    const date = parseDate(r.dos);
    const dx = (r.codes || []).filter((c) => /dx/i.test(c.type || '') || /^[A-Z]\d/.test(c.code));
    const first = dx[0];
    const sections = parseRecordSections(r.body || '');
    const base = { date, when: r.dos || '', sections, prev: r, current: false };
    rows.push({
      ...base,
      id: 'prev-enc-' + (r.key || i),
      tab: 'enc',
      episode: r.episode || '',
      cells: {
        type: /admi|inpatient|hospital/i.test(r.title) ? 'Hospital Encounter' : 'Office Visit',
        with: r.provider || '',
        desc: r.title + (first ? ` (Primary Dx) [${first.code}]` : ''),
        cc: firstLine(sections.filter((x) => /CHIEF COMPLAINT|REASON/i.test(x.head))),
        disch: '',
        dept: r.facility || '',
      },
    });
    rows.push({
      ...base,
      id: 'prev-note-' + (r.key || i),
      tab: r.noteType ? noteTabOf(r.noteType, r.title) : tabOf(r.title),
      imaging:
        tabOf(r.title) === 'rad'
          ? imagingOf({
              title: r.title,
              provider: r.provider || '',
              date: r.dos || '',
              key: String(r.key || i),
            })
          : undefined,
      cells: {
        type: r.noteType || 'Progress Notes',
        desc: r.title,
        author: r.provider || '',
        status: /^(labs|rad)$/.test(tabOf(r.title)) ? 'Final result' : 'Signed',
        abn: ABNORMAL.test(r.body || '') && /lab|rad/.test(tabOf(r.title)) ? 'Abnormal' : '',
        examEnd: tabOf(r.title) === 'rad' ? r.dos || '' : '',
        signed: tabOf(r.title) === 'rad' ? r.dos || '' : '',
        etype: 'Office Visit',
        encDate: r.dos || '',
        dept: r.facility || '',
        spec: '',
      },
    });
  });

  // Referrals written in this visit's record: a REFERRAL / CONSULT section, or "refer …" sentences
  // in the plan. The type comes from the words; the ID is a stable number made from the text.
  const secs = (docs.find((d) => d.key === 'full') || { sections: docs.flatMap((d) => d.sections) })
    .sections;
  const refTexts = [
    ...secs
      .filter((x) => /REFERRAL|CONSULT/i.test(x.head))
      .flatMap((x) => String(x.body || '').split('\n')),
    ...secs
      .filter((x) => /PLAN|ASSESSMENT|DISPOSITION/i.test(x.head))
      .flatMap((x) => String(x.body || '').split(/(?<=\.)\s+/))
      .filter((t) => /\brefer(?:red|ral|s)?\b/i.test(t)),
  ]
    .map((t) => t.trim())
    .filter(Boolean);
  [...new Set(refTexts)].forEach((t, i) => {
    const type = RFL_TYPES.find(([, re]) => re.test(t))[0];
    const to = referredTo(t);
    rows.push({
      id: 'ref-' + i,
      tab: 'referrals',
      current: true,
      date: visit,
      when: visitText,
      sections: [{ head: 'REFERRAL', body: t }],
      cells: {
        type,
        rclass: 'Internal',
        refId: refId(chart.id + t),
        desc: t,
        status: 'Open',
        author: provider,
      },
      // The referral form shown in the preview (groups of label / value rows).
      detail: [
        {
          title: '',
          rows: [
            ['Type', type],
            ['Class', 'Internal'],
            ['Priority', /\b(urgent|stat|asap|emergent)\b/i.test(t) ? 'Urgent' : 'Routine'],
            [
              'Start-Exp',
              visit ? `${fmtDate(visit)} - ${fmtDate(addDays(visit, 180))}` : visitText,
            ],
            ['Status', 'Open'],
          ],
        },
        {
          title: 'Referred By',
          rows: [
            ['Provider', provider],
            ['Department', [e.facility, chart.deptName].filter(Boolean).join(' · ')],
          ],
        },
        {
          title: 'Referred To',
          rows: [
            ['Department', to ? to.toUpperCase() : ''],
            ['Provider Speciality', to],
            ['Procedures (free text)', t],
          ],
        },
        {
          title: 'Visit Counts',
          rows: [
            ['Requested/Authorized', '1/0'],
            ['Scheduled/Completed', '0/0'],
          ],
        },
      ],
    });
  });

  // Structured results and orders (chart.clinical, from LAB | … / MED | … rows of the upload).
  // structured = not a note (kept out of the Notes activity). Each row's preview is its form.
  const cl = chart.clinical || {};
  const opNote = docs.find((d) =>
    /operative|op note|procedure note/i.test(`${d.type || ''} ${d.title}`),
  );
  const addRow = (tab, i, x, form, text, more = []) =>
    rows.push({
      id: tab + '-s' + i,
      tab,
      current: true,
      structured: true,
      date: parseDate(x.when) || visit,
      when: x.when || visitText,
      sections: [{ head: 'RECORD', body: text }],
      cells: x.cells,
      detail: [{ title: '', rows: form }, ...more],
      sourceTitle: 'As documented',
      ...(x.doc ? { doc: x.doc } : {}),
      ...(x.file ? { file: x.file } : {}), // Media: the attached scan / photo
    });
  (cl.labs || []).forEach((l, i) =>
    addRow(
      'labs',
      i,
      {
        when: l.collected,
        cells: {
          desc: l.test,
          value: l.value || '',
          units: l.units || '',
          range: l.range || '',
          abn: l.flag || '',
          status: l.status || 'Final',
          author: provider,
        },
      },
      [
        ['Test', l.test],
        ['Value', [l.value, l.units].filter(Boolean).join(' ')],
        ['Reference Range', l.range],
        [
          'Flag',
          l.flag && `${l.flag} (abnormal — not a diagnosis unless the provider documents one)`,
        ],
        ['Collected', l.collected],
        ['Status', l.status || 'Final'],
      ],
      [l.test, [l.value, l.units].filter(Boolean).join(' '), l.range && `(ref ${l.range})`, l.flag]
        .filter(Boolean)
        .join(' '),
    ),
  );
  (cl.meds || []).forEach((m, i) =>
    addRow(
      'meds',
      i,
      {
        when: m.start,
        cells: {
          desc: m.name,
          dose: m.dose || '',
          route: m.route || '',
          freq: m.frequency || '',
          author: m.prescriber || '',
          status: m.status || 'Active',
          end: m.end || '',
        },
      },
      [
        ['Medication', m.name],
        ['Dose', m.dose],
        ['Route', m.route],
        ['Frequency', m.frequency],
        ['Prescriber', m.prescriber],
        ['Start', m.start],
        ['End', m.end],
        ['Status', m.status || 'Active'],
      ],
      [m.name, m.dose, m.route, m.frequency].filter(Boolean).join(' '),
    ),
  );
  (cl.orders || []).forEach((o, i) =>
    addRow(
      'orders',
      i,
      {
        when: o.date,
        cells: {
          desc: o.order,
          type: o.type || '',
          status: o.status || 'Ordered',
          author: o.orderedBy || '',
        },
      },
      [
        ['Order', o.order],
        ['Order Type', o.type],
        ['Status', o.status || 'Ordered'],
        ['Ordered By', o.orderedBy],
        ['Date', o.date],
        ['Note', 'An order alone does not show the service was performed.'],
      ],
      [o.order, o.type].filter(Boolean).join(' · '),
    ),
  );
  (cl.ldas || []).forEach((l, i) =>
    addRow(
      'ldas',
      i,
      {
        when: l.inserted,
        cells: {
          desc: l.device,
          site: l.site || '',
          removed: l.removed || '',
          status: l.status || (l.removed ? 'Removed' : 'Active'),
        },
      },
      [
        ['Device', l.device],
        ['Site', l.site],
        ['Inserted', l.inserted],
        ['Removed', l.removed],
        ['Status', l.status || (l.removed ? 'Removed' : 'Active')],
      ],
      [l.device, l.site].filter(Boolean).join(' · '),
    ),
  );
  (cl.procedures || []).forEach((p, i) =>
    addRow(
      'proc',
      i,
      {
        when: p.date,
        doc: opNote && opNote.key, // "Open Note" opens the operative note
        cells: {
          desc: p.procedure,
          author: p.performedBy || provider,
          type: 'Procedure',
          status: p.status || 'Completed',
        },
      },
      [
        ['Procedure', p.procedure],
        ['Date', p.date],
        ['Performed By', p.performedBy || provider],
        ['Status', p.status || 'Completed'],
        ['Operative Note', opNote ? opNote.title : ''],
      ],
      p.procedure,
    ),
  );
  (cl.anesthesia || []).forEach((a, i) => {
    const dur = minutesBetween(a.start, a.stop);
    addRow(
      'anes',
      i,
      {
        when: visitText,
        cells: {
          desc: a.procedure || '',
          type: a.type || '',
          asa: a.asa || '',
          start: a.start || '',
          stop: a.stop || '',
          dur: dur === null ? '' : dur + ' min',
          author: a.provider || '',
        },
      },
      [
        ['Procedure', a.procedure],
        ['Anesthesia Type', a.type],
        ['ASA Class', a.asa],
        ['Anesthesia Start', a.start],
        ['Anesthesia Stop', a.stop],
        ['Duration', dur === null ? '' : dur + ' minutes'],
        ['Anesthesia Provider', a.provider],
      ],
      [a.type, a.procedure].filter(Boolean).join(' · '),
    );
  });
  // Cardiology studies: the measurements ("HR 112; QTc 440 ms; EF 35%") are listed one per row.
  (cl.cards || []).forEach((c, i) => {
    let findings = 0;
    const measures = String(c.measurements || '')
      .split(';')
      .map((m) => m.trim())
      .filter(Boolean)
      .map((m) => {
        const x = m.match(/^([A-Za-z][A-Za-z0-9 /().-]*?)\s*[:=]?\s*([-<>]?\d.*)$/);
        return x
          ? [x[1].trim(), x[2].trim()]
          : [++findings > 1 ? 'Finding ' + findings : 'Finding', m]; // no number: a finding ("Mild MR")
      });
    addRow(
      'card',
      i,
      {
        when: c.date,
        cells: {
          desc: c.study,
          interp: c.interpretation || '',
          abn: /^(y|yes|abn|abnormal|a)$/i.test(String(c.flag || '').trim())
            ? 'Abnormal'
            : c.flag && !/^(n|no|normal)$/i.test(c.flag)
              ? c.flag
              : '',
          status: c.status || 'Final result',
          author: c.readBy || '',
        },
      },
      [
        ['Study', c.study],
        ['Date', c.date],
        ['Interpretation', c.interpretation],
        ['Abnormal?', c.flag],
        ['Status', c.status || 'Final result'],
        ['Read By', c.readBy],
      ],
      [c.study, c.interpretation].filter(Boolean).join(': '),
      measures.length ? [{ title: 'Measurements', rows: measures }] : [],
    );
  });
  (cl.media || []).forEach((m, i) =>
    addRow(
      'media',
      i,
      {
        when: m.date,
        file: m.file && m.file.url ? m.file : null,
        cells: {
          desc: m.document,
          type: m.type || '',
          author: m.from || '',
          att: m.file && m.file.url ? (isImage(m.file) ? 'Image' : 'PDF') : '',
        },
      },
      [
        ['Document', m.document],
        ['Type', m.type],
        ['Date', m.date],
        ['From', m.from],
      ],
      [m.document, m.type].filter(Boolean).join(' · '),
    ),
  );
  // Operative / procedure notes and anesthesia records are notes (Notes/Trans) and are also listed
  // in Proc / Anes. copy = a second listing (kept out of the Notes activity).
  rows
    .filter((r) => r.tab === 'notes' && !r.structured)
    .forEach((r) => {
      const t = `${r.cells.type} ${r.cells.desc}`;
      const tab = /anesth|anaesth/i.test(t)
        ? 'anes'
        : /operative|procedure note|op note|procedure report/i.test(t)
          ? 'proc'
          : '';
      if (tab) rows.push({ ...r, id: tab + '-' + r.id, tab, copy: true });
    });

  // ED Visits: one row per emergency visit (this visit and earlier ones), with arrival /
  // departure, chief complaint, triage acuity, the ED impression, disposition, triage vitals and
  // discharge instructions. The preview shows these, then the visit report.
  rows
    .filter((r) => r.tab === 'enc')
    .forEach((enc) => {
      const src = enc.current ? e : enc.prev || {};
      const ed = enc.current
        ? /^ED/.test(chart.dept || '') ||
          String(e.pos || '').trim() === '23' ||
          ED_WORDS.test(e.visitType || '') ||
          !!(e.arrival || e.acuity)
        : ED_WORDS.test(src.title || '') || !!(src.arrival || src.acuity);
      if (!ed) return;
      const secs = enc.sections || [];
      const dxCodes = enc.current ? [] : (src.codes || []).filter(isDxCode);
      const dx =
        dxCodes.map((c) => c.desc || c.code).join('; ') ||
        firstLine(secs.filter((s) => /IMPRESSION|DIAGNOS|ASSESSMENT/i.test(s.head)));
      const vitals = vitalsOf(bodyOf(secs));
      const acuity = /^[1-5]$/.test(String(src.acuity || '').trim())
        ? 'ESI ' + String(src.acuity).trim()
        : src.acuity || '';
      const cells = {
        type: 'Emergency',
        departure: src.departure || (enc.current ? e.discharge || '' : ''),
        cc: enc.cells.cc,
        acuity,
        dx,
        disp: src.disposition || '',
        with: enc.cells.with,
        dept: enc.cells.dept,
      };
      rows.push({
        ...enc,
        id: 'ed-' + enc.id,
        structured: true, // a visit, not a note
        tab: 'ed',
        when: src.arrival || enc.when,
        cells,
        detail: [
          {
            title: 'ED Visit',
            rows: [
              ['Arrival', src.arrival || enc.when],
              ['Departure', cells.departure],
              ['Acuity', acuity],
              ['Chief Complaint', cells.cc],
              ['ED Diagnoses', dx],
              ['Disposition', cells.disp],
              ['Provider', cells.with],
              ['Department', cells.dept],
            ],
          },
          {
            title: 'Triage Vitals',
            rows: VITAL_LIST.map((v) => [v.label, vitals[v.key]]),
          },
          {
            title: 'Discharge',
            rows: [
              [
                'Instructions / Follow-up',
                firstLine(
                  secs.filter((s) =>
                    /DISCHARGE INSTRUCTION|PATIENT INSTRUCTION|FOLLOW.?UP/i.test(s.head),
                  ),
                ),
              ],
            ],
          },
        ],
      });
    });

  // Episodes of care (chart.episodes): each lists the encounters linked to it by name
  // (encounter.episode / previousRecords[].episode). Charts without episodes get one episode of
  // all their visits, as before.
  const encs = rows.filter((r) => r.tab === 'enc');
  const named = chart.episodes || [];
  const episodes = named.length
    ? named.map((ep) => ({
        ...ep,
        visits: encs.filter((r) => r.episode && r.episode.toLowerCase() === ep.name.toLowerCase()),
      }))
    : [
        {
          key: 'all',
          name: (chart.deptName || 'Care') + ' episode',
          type: 'Episode',
          status: 'Active',
          provider,
          visits: encs,
        },
      ];
  episodes.forEach((ep) => {
    const first = ep.visits.reduce((m, r) => (r.date && (!m || r.date < m.date) ? r : m), null);
    const start = ep.start || (first ? first.when : '');
    const visitList = ep.visits
      .slice()
      .sort((a, b) => (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0))
      .map((r) => [r.when, r.cells.type, r.cells.desc].filter(Boolean).join(' · '))
      .join('\n');
    rows.push({
      id: 'episode-' + ep.key,
      tab: 'episodes',
      current: ep.visits.some((r) => r.current),
      date: parseDate(start) || (first ? first.date : visit),
      when: start,
      episode: { ...ep, visitIds: ep.visits.map((r) => r.id) },
      sections: [{ head: 'LINKED ENCOUNTERS', body: visitList || 'No encounters linked yet.' }],
      sourceTitle: 'Linked Encounters',
      cells: {
        desc: ep.name,
        type: ep.type || 'Episode',
        status: ep.status || 'Active',
        end: ep.end || '',
        with: ep.provider || '',
        visits: String(ep.visits.length),
      },
      // The episode form shown in the preview.
      detail: [
        {
          title: '',
          rows: [
            ['Episode', ep.name],
            ['Type', ep.type],
            ['Status', ep.status || 'Active'],
            ['Start Date', start],
            ['End Date', ep.end],
            ['Responsible Provider', ep.provider],
            ['Diagnosis', ep.dx],
            ['Note', ep.note],
            ['Linked Encounters', String(ep.visits.length)],
          ],
        },
      ],
    });
  });

  rows.forEach((r) => (r.group = timeGroup(r.date, visit, r.current)));
  return rows;
}

// Plain text of a row, for the filter box.
export const rowText = (r) =>
  (Object.values(r.cells).join(' ') + ' ' + bodyOf(r.sections)).toLowerCase();

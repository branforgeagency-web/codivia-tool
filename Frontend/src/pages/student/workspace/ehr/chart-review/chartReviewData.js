/* CODIVIA EHR shell — Chart Review rows built from the chart (no extra API).
   Sources: the chart's documents (uploaded documents, or the record split into groups), answered
   physician queries and chart.previousRecords (earlier encounters). Each row: { id, tab, when, date,
   cells, sections, doc?, prev?, current }. Assumptions (no source data for them):
   - a document's tab comes from its title (lab / imaging / procedure / medication words; else Notes);
   - "Abnormal" = the text has an abnormal-result word (abnormal, positive, elevated, high, low …);
   - current-visit documents are dated with the encounter's date of service (or admit date). */
import { parseRecordSections } from '../../recordSections.js';

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
  { key: 'letters', label: 'Letters', cols: DOC_COLS },
  { key: 'ed', label: 'ED Visits', color: '#c0281b', cols: DOC_COLS },
  { key: 'anes', label: 'Anes', cols: DOC_COLS },
  {
    key: 'proc',
    label: 'Proc',
    cols: [
      ['when', 'Date'],
      ['desc', 'Procedure'],
      ['status', 'Status'],
      ['author', 'Provider'],
    ],
  },
  {
    key: 'card',
    label: 'Card',
    cols: [
      ['when', 'Date'],
      ['desc', 'Study'],
      ['abn', 'Abnormal?'],
      ['status', 'Status'],
      ['author', 'Auth Prov'],
    ],
  },
  {
    key: 'labs',
    label: 'Labs',
    color: '#e2c400',
    cols: [
      ['when', 'Date/Time'],
      ['desc', 'Test'],
      ['abn', 'Abnormal?'],
      ['status', 'Status'],
      ['author', 'Auth Prov'],
      ['etype', 'Encounter Type'],
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
      ['when', 'Date'],
      ['desc', 'Medications'],
      ['status', 'Status'],
      ['author', 'Prescriber'],
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
    cols: [
      ['when', 'Date'],
      ['desc', 'Document'],
      ['type', 'Type'],
      ['author', 'From'],
    ],
  },
  { key: 'orders', label: 'Other Orders', cols: DOC_COLS },
  {
    key: 'episodes',
    label: 'Episodes',
    cols: [
      ['when', 'Start'],
      ['desc', 'Episode'],
      ['type', 'Type'],
      ['with', 'Provider'],
      ['status', 'Status'],
    ],
  },
  { key: 'ldas', label: 'LDAs', cols: DOC_COLS },
];

// Most specific first: a title is put in the first tab whose words it has.
const TAB_OF_TITLE = [
  ['letters', /\bletter|correspondence/i],
  ['ed', /emergency|\bED\b|triage/],
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
    const tab = d.isQuery ? 'notes' : tabOf(d.title);
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
        date: visit,
        when: d.isQuery ? (d.sub || '').split(' · ')[0] : visitText,
        sections: x.sections,
        doc: d.key,
        imaging:
          tab === 'rad' && !d.isQuery
            ? imagingOf({ title: x.title, provider, date: visitText, key: String(chart.id) })
            : undefined,
        cells: {
          type: d.isQuery
            ? 'Query Response'
            : d.key === 'full'
              ? 'Progress Notes'
              : d.sub || 'Note',
          desc: x.title,
          author: d.isQuery ? (d.sub || '').split(' · ')[1] || '' : provider,
          status: d.isQuery
            ? 'Answered'
            : tab === 'labs' || tab === 'rad'
              ? 'Final result'
              : 'Signed',
          abn:
            (tab === 'labs' || tab === 'rad') && ABNORMAL.test(bodyOf(x.sections))
              ? 'Abnormal'
              : '',
          // Imaging: a resulted study is done and signed on the visit date.
          examEnd: tab === 'rad' && !d.isQuery ? visitText : '',
          signed: tab === 'rad' && !d.isQuery ? visitText : '',
          etype,
          encDate: visitText,
          dept: e.facility || chart.deptName || '',
          spec: e.specialty || '',
        },
      }),
    );
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
      tab: tabOf(r.title) === 'notes' ? 'notes' : tabOf(r.title),
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
        type: 'Progress Notes',
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

  // One care episode: this department's visits, from the earliest encounter on the chart.
  const encs = rows.filter((r) => r.tab === 'enc');
  const start = encs.reduce((m, r) => (r.date && (!m || r.date < m.date) ? r : m), null);
  rows.push({
    id: 'episode',
    tab: 'episodes',
    current: true,
    date: start ? start.date : visit,
    when: start ? start.when : visitText,
    sections: [
      {
        head: 'EPISODE',
        body: encs
          .map((r) => [r.when, r.cells.type, r.cells.desc].filter(Boolean).join(' · '))
          .join('\n'),
      },
    ],
    cells: {
      desc: (chart.deptName || 'Care') + ' episode',
      type: 'Episode',
      with: provider,
      status: 'Active · ' + encs.length + ' visit' + (encs.length === 1 ? '' : 's'),
    },
  });

  rows.forEach((r) => (r.group = timeGroup(r.date, visit, r.current)));
  return rows;
}

// Plain text of a row, for the filter box.
export const rowText = (r) =>
  (Object.values(r.cells).join(' ') + ' ' + bodyOf(r.sections)).toLowerCase();

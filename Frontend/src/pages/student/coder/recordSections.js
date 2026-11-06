import { TAB_MAP, TOP_HEADINGS } from './constants.js';

export function parseRecordSections(record) {
  if (!record) return [];
  const lines = record.split('\n');
  const heading = /^[A-Z][A-Z0-9 \/&()',\-\.\[\]]{2,44}:\s*$/; // full-line heading
  const inlineHead = /^([A-Z][A-Z0-9 \/&()',\-\.\[\]]{2,44}):\s+(.*)$/; // heading: value on same line
  const secs = [];
  let cur = null;
  const pushLine = (t) => {
    if (!cur) {
      cur = { head: 'RECORD', body: [] };
      secs.push(cur);
    }
    cur.body.push(t);
  };
  for (const ln of lines) {
    const t = ln.trim();
    if (heading.test(t)) {
      cur = { head: t.replace(/:\s*$/, ''), body: [] };
      secs.push(cur);
    } else if (
      inlineHead.test(t) &&
      TOP_HEADINGS.has(t.match(inlineHead)[1].trim().toUpperCase())
    ) {
      const m = t.match(inlineHead);
      cur = { head: m[1], body: [m[2]] };
      secs.push(cur);
    } else {
      pushLine(ln);
    }
  }
  return secs.map((s) => ({ head: s.head, body: s.body.join('\n').replace(/^\n+|\n+$/g, '') }));
}

export function groupSectionsIntoTabs(secs) {
  const findTab = (head) => {
    const H = head.toUpperCase();
    for (const t of TAB_MAP) {
      if (t.match.some((m) => H === m || H.startsWith(m))) return t.tab;
    }
    return 'Other';
  };
  const order = TAB_MAP.map((t) => t.tab).concat(['Other']);
  const groups = {};
  secs.forEach((s) => {
    if (s.head === 'RECORD' && !s.body.trim()) return;
    const tab = s.head === 'RECORD' ? 'Demographics' : findTab(s.head);
    (groups[tab] = groups[tab] || []).push(s);
  });
  return order.filter((t) => groups[t]).map((t) => ({ tab: t, sections: groups[t] }));
}

// Pull demographic fields for the blue patient header, from the record if present.
export function chartHeaderFields(chart) {
  const rec = chart.record || '';
  const grab = (re) => {
    const m = rec.match(re);
    return m ? m[1].trim() : '';
  };
  return {
    mrn:
      grab(/Med Rec Num[:\s]+([A-Z0-9]+)/i) ||
      grab(/MRN[:\s]+([A-Z0-9]+)/i) ||
      'M' + String(chart.id).replace(/\D/g, '').padStart(6, '0'),
    acct:
      grab(/Account Num[:\s]+([A-Z0-9]+)/i) ||
      grab(/Account #[:\s]+([A-Z0-9]+)/i) ||
      'V' + String(chart.id).replace(/\D/g, '').padStart(8, '0'),
    dos:
      grab(/Date of Service[:\s]+([0-9\-\/]+)/i) ||
      grab(/DOS[:\s]+([0-9\-\/]+)/i) ||
      grab(/SOC Date[:\s]+([0-9\-\/]+)/i) ||
      grab(/Date of surgery[:\s]+([A-Za-z0-9,\s]+)/i) ||
      '',
    provider:
      grab(/Provider[:\s]+([A-Za-z.,\s]+?)(?:\(|\n)/i) ||
      grab(/Clinician[:\s]+([A-Za-z.,\s]+)/i) ||
      '',
    ptype: grab(/Patient type[:\s]+(New patient|Established patient)/i),
  };
}

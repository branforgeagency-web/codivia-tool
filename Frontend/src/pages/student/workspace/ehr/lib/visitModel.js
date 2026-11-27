/* One encounter as a "visit report": title, date, place, provider, primary Dx, the note, orders,
   medication changes and visit diagnoses. Used by the Chart Review preview and the sidebar's Visit
   Report tabs, so both always show the same thing.
   - row = an earlier encounter (chart.previousRecords, via chartReviewRows): its own codes.
   - no row = this visit: the student's coding so far (draft.dx / draft.lines). */
import { sectionsMatching, visitSections } from './chartText.js';

const MED_CHANGE =
  /\b(start|started|stop|discontinue|increase|decrease|switch|prescribe|continue)\b/i;

// Plan / discharge sentences that start, stop or change a medicine.
export const medChangesOf = (sections) =>
  sectionsMatching(sections, /PLAN|DISCHARGE/i)
    .flatMap((s) => String(s.body || '').split(/(?<=\.)\s+/))
    .filter((t) => MED_CHANGE.test(t))
    .map((t) => t.trim());

const isDx = (c) => /dx/i.test(c.type || '') || (!c.type && /^[A-Z]\d/.test(c.code || ''));

export function visitModel({ chart, docs, draft, row }) {
  const e = chart.encounter || {};
  if (row && row.prev) {
    const p = row.prev;
    const codes = p.codes || [];
    const dx = codes.filter(isDx);
    return {
      key: row.id,
      title: (row.cells && row.cells.type) || 'Office Visit',
      date: p.dos || '',
      place: p.facility || '',
      provider: p.provider || '',
      specialty: '',
      dx: dx[0] ? { name: dx[0].desc || dx[0].code, code: dx[0].code } : null,
      noteTitle: p.title || 'Progress Notes',
      noteBy: p.provider || '',
      sections: row.sections || [],
      orders: codes.filter((c) => !isDx(c)).map((c) => ({ code: c.code, desc: c.desc || '' })),
      medChanges: medChangesOf(row.sections || []),
      diagnoses: dx.map((c) => ({ code: c.code, desc: c.desc || '' })),
      codes: codes.length ? p : null, // "Use these codes"
    };
  }
  const secs = visitSections(docs);
  const first = draft.dx[0];
  return {
    key: 'current',
    title: e.visitType || (chart.encounterType === 'IP' ? 'Hospital Encounter' : 'Office Visit'),
    date: e.dos || e.admit || '',
    place: [e.facility, chart.deptName].filter(Boolean).join(', '),
    provider: e.provider || '',
    specialty: e.specialty || chart.deptName || '',
    dx: first ? { name: first.desc || first.code, code: first.code } : null,
    noteTitle: 'Progress Notes',
    noteBy: [e.provider, e.specialty].filter(Boolean).join(' • '),
    sections: secs,
    orders: draft.lines.map((l) => ({ code: l.code, desc: l.desc || '' })),
    medChanges: medChangesOf(secs),
    diagnoses: draft.dx.map((d) => ({ code: d.code, desc: d.desc || '' })),
    current: true,
  };
}

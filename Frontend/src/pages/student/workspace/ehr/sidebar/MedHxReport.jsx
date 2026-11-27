/* Sidebar › Reports › Med/Hx: medications, allergies, history sections, previously billed codes. */
import { isAlertAllergy, medsOf, sectionsMatching, visitSections } from '../lib/chartText.js';
import { SideCard } from '../ui/index.js';

const titleCase = (s) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

export function MedHxReport({ chart, docs }) {
  const secs = visitSections(docs);
  const meds = medsOf(secs);
  const e = chart.encounter || {};
  return (
    <>
      <SideCard title={`Current Medications (${meds.length})`}>
        {meds.length ? (
          meds.map((m, i) => (
            <div key={i} className="ehr-li">
              {m}
            </div>
          ))
        ) : (
          <p className="ehr-small">No medications documented.</p>
        )}
      </SideCard>
      <SideCard title="Allergies">
        <div className={'ehr-li' + (isAlertAllergy(e.allergy) ? ' alert' : '')}>
          {e.allergy || 'Not on File'}
        </div>
      </SideCard>
      {sectionsMatching(secs, /PAST MEDICAL|PAST SURGICAL|FAMILY|SOCIAL/i).map((s, i) => (
        <SideCard key={i} title={titleCase(s.head)}>
          <p className="ehr-small pre">{s.body}</p>
        </SideCard>
      ))}
      {(chart.previousRecords || []).length > 0 && (
        <SideCard title="Previously Billed Codes">
          {chart.previousRecords.map((r, i) => (
            <div key={i} className="ehr-li">
              <b>{r.dos}</b> {r.title}: {(r.codes || []).map((c) => c.code).join(', ') || '—'}
            </div>
          ))}
        </SideCard>
      )}
    </>
  );
}

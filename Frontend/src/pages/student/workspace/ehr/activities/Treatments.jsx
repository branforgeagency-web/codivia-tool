/* Treatments: medications, procedures and the plan documented for this visit. */
import { medsOf, sectionsMatching, visitSections } from '../lib/chartText.js';
import { ActivityHeader, Card, Note, ReportView } from '../ui/index.js';

export function Treatments({ docs, find }) {
  const secs = visitSections(docs);
  const meds = medsOf(secs);
  const plan = sectionsMatching(secs, /PLAN|PROCEDURE|OPERATIVE|TREATMENT|DISPOSITION|DISCHARGE/i);
  return (
    <div className="ehr-act">
      <ActivityHeader
        title="Treatments"
        sub="Medications, procedures and the plan documented for this visit"
      />
      <Card title={`Current Medications (${meds.length})`} icon="bi-capsule">
        {meds.length ? (
          <ul className="ehr-medlist">
            {meds.map((m, i) => (
              <li key={i}>
                <i className="bi bi-capsule-pill" /> {m}
              </li>
            ))}
          </ul>
        ) : (
          <Note>No medications documented.</Note>
        )}
      </Card>
      <Card title="Plan & Procedures" icon="bi-clipboard2-check">
        {plan.length ? (
          <ReportView sections={plan} find={find} />
        ) : (
          <Note>No plan or procedure section in this chart.</Note>
        )}
      </Card>
    </div>
  );
}

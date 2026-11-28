/* Treatments: treatment plans (sessions done / planned, status, diagnosis, approval), the medicines
   actually given this visit (injections / infusions with start, stop and duration), current
   medications and the documented plan. Data: chart.clinical.treatments / .given / .meds (TREATMENT |
   ADMIN | MED rows of the upload); without them, meds and plan come from the note text. */
import { minutesBetween } from '../chart-review/chartReviewData.js';
import { medsOf, sectionsMatching, visitSections } from '../lib/chartText.js';
import { ActivityHeader, Card, EhrTable, Note, ReportView } from '../ui/index.js';

// "4/12" → { done: 4, planned: 12 }
const sessionsOf = (s) => {
  const m = String(s || '').match(/(\d+)\s*(?:\/|of)\s*(\d+)/i);
  return m && Number(m[2]) > 0 ? { done: Number(m[1]), planned: Number(m[2]) } : null;
};

export function Treatments({ chart, docs, find }) {
  const cl = (chart && chart.clinical) || {};
  const plans = cl.treatments || [];
  const given = cl.given || [];
  const secs = visitSections(docs);
  const meds = cl.meds && cl.meds.length ? cl.meds : null;
  const textMeds = meds ? [] : medsOf(secs);
  const plan = sectionsMatching(secs, /PLAN|PROCEDURE|OPERATIVE|TREATMENT|DISPOSITION|DISCHARGE/i);
  return (
    <div className="ehr-act">
      <ActivityHeader
        title="Treatments"
        sub="Treatment plans, medicines given, current medications and the documented plan"
      />
      <Note>
        Code only what is documented as performed. A planned or ordered treatment is not billable on
        its own.
      </Note>

      <Card title={`Treatment Plans (${plans.length})`} icon="bi-clipboard2-pulse">
        <EhrTable
          cols={[
            'Plan',
            'Type',
            'Diagnosis',
            'Schedule',
            'Progress',
            'Status',
            'Ordered By',
            'Approval',
            'Instructions',
            'Order Reference',
          ]}
          count={plans.length}
          empty="No treatment plans on this chart."
        >
          {plans.map((p, i) => {
            const s = sessionsOf(p.sessions);
            return (
              <tr key={i}>
                <td>
                  <b>{p.plan}</b>
                </td>
                <td>{p.type}</td>
                <td>{p.dx}</td>
                <td>{p.schedule}</td>
                <td>
                  {s ? (
                    <span
                      className="ehr-progress"
                      title={`${s.done} of ${s.planned} sessions done`}
                    >
                      <span style={{ width: Math.min(100, (s.done / s.planned) * 100) + '%' }} />
                      <small>
                        {s.done} of {s.planned}
                      </small>
                    </span>
                  ) : (
                    p.sessions || ''
                  )}
                </td>
                <td>{p.status || '—'}</td>
                <td>{p.orderedBy}</td>
                <td>{p.approval}</td>
                <td>{p.instructions || '—'}</td>
                <td>{p.orderRef || '—'}</td>
              </tr>
            );
          })}
        </EhrTable>
      </Card>

      <Card title={`Given This Visit (${given.length})`} icon="bi-droplet-half">
        <EhrTable
          cols={['Medication', 'Dose', 'Route', 'Start', 'Stop', 'Duration', 'Given By', 'Diagnosis', 'Order Reference']}
          count={given.length}
          empty="No injections or infusions recorded as given."
        >
          {given.map((g, i) => {
            const min = minutesBetween(g.start, g.stop);
            return (
              <tr key={i}>
                <td>
                  <b>{g.drug}</b>
                </td>
                <td>{g.dose}</td>
                <td>{g.route}</td>
                <td>{g.start}</td>
                <td>{g.stop}</td>
                <td>{min === null ? '' : min + ' min'}</td>
                <td>{g.givenBy}</td>
                <td>{g.dx || '—'}</td>
                <td>{g.orderRef || '—'}</td>
              </tr>
            );
          })}
        </EhrTable>
      </Card>

      <Card
        title={`Current Medications (${meds ? meds.length : textMeds.length})`}
        icon="bi-capsule"
      >
        {meds ? (
          <EhrTable
            cols={['Medication', 'Dose', 'Route', 'Frequency', 'Prescriber', 'Status']}
            count={meds.length}
            empty=""
          >
            {meds.map((m, i) => (
              <tr key={i}>
                <td>
                  <b>{m.name}</b>
                </td>
                <td>{m.dose}</td>
                <td>{m.route}</td>
                <td>{m.frequency}</td>
                <td>{m.prescriber}</td>
                <td>{m.status || 'Active'}</td>
              </tr>
            ))}
          </EhrTable>
        ) : textMeds.length ? (
          <ul className="ehr-medlist">
            {textMeds.map((m, i) => (
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

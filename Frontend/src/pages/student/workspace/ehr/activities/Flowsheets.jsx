/* Flowsheets: vital signs of this visit and of each earlier encounter that recorded them. */
import { parseRecordSections } from '../../recordSections.js';
import { sectionsText, visitSections, VITAL_LIST, vitalsOf } from '../lib/chartText.js';
import { ActivityHeader, Card, Note } from '../ui/index.js';

export function Flowsheets({ chart, docs }) {
  const cols = [
    {
      label: 'This Visit',
      sub: (chart.encounter || {}).dos || '',
      v: vitalsOf(sectionsText(visitSections(docs))),
    },
  ].concat(
    (chart.previousRecords || [])
      .map((r) => ({
        label: r.title,
        sub: r.dos || '',
        v: vitalsOf(sectionsText(parseRecordSections(r.body || ''))),
      }))
      .filter((c) => Object.keys(c.v).length),
  );
  const any = cols.some((c) => Object.keys(c.v).length);
  return (
    <div className="ehr-act">
      <ActivityHeader title="Flowsheets" sub="Vital signs documented in the record" />
      <Card title="Vitals" icon="bi-activity">
        {any ? (
          <table className="ehr-table compact flow">
            <thead>
              <tr>
                <th>Measure</th>
                {cols.map((c, i) => (
                  <th key={i}>
                    {c.label}
                    <small>{c.sub}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VITAL_LIST.map((m) => (
                <tr key={m.key}>
                  <th>
                    {m.label} {m.unit && <small>({m.unit})</small>}
                  </th>
                  {cols.map((c, i) => (
                    <td key={i}>{c.v[m.key] || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Note>No vital signs found in this chart.</Note>
        )}
      </Card>
    </div>
  );
}

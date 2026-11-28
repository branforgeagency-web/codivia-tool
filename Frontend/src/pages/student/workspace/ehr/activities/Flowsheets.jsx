import { parseRecordSections } from '../../recordSections.js';
import { sectionsText, visitSections, VITAL_LIST, vitalsOf } from '../lib/chartText.js';
import { ActivityHeader, Card, Note } from '../ui/index.js';

const recordedTime = (label) => {
  const time = Date.parse(label);
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

function RecordedFlowsheet({ name, entries }) {
  const timestamps = [...new Set(entries.map((entry) => entry.recordedAt || ''))].sort(
    (a, b) => recordedTime(a) - recordedTime(b),
  );
  const measures = new Map();
  entries.forEach((entry) => {
    const key = entry.measure.toLowerCase();
    if (!measures.has(key)) measures.set(key, { label: entry.measure, readings: new Map() });
    const { readings } = measures.get(key);
    const date = entry.recordedAt || '';
    if (!readings.has(date)) readings.set(date, []);
    readings.get(date).push(entry);
  });

  return (
    <Card title={name} icon="bi-clipboard-data">
      <div className="ehr-flow-scroll" role="region" aria-label={`${name} readings`} tabIndex={0}>
        <table className="ehr-table compact flow ehr-recorded-flow">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              {timestamps.map((date) => (
                <th key={date} scope="col">
                  {date || 'Time not documented'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...measures].map(([key, { label, readings }]) => (
              <tr key={key}>
                <th scope="row">{label}</th>
                {timestamps.map((date) => (
                  <td key={date}>
                    {readings.get(date)?.map((entry, index) => (
                      <div key={index} className="ehr-flow-reading">
                        <div>{[entry.value, entry.unit].filter(Boolean).join(' ') || '—'}</div>
                        {entry.recordedBy && <small>{entry.recordedBy}</small>}
                        {entry.note && <small>{entry.note}</small>}
                      </div>
                    )) || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function Flowsheets({ chart, docs }) {
  const groups = new Map();
  (chart.clinical?.flowsheetEntries || []).forEach((entry) => {
    if (!entry.measure) return;
    const name = entry.group || 'Measurements';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(entry);
  });
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
      <ActivityHeader
        title="Flowsheets"
        sub="Measurements and assessments documented in the chart"
      />
      {[...groups].map(([name, entries]) => (
        <RecordedFlowsheet key={name} name={name} entries={entries} />
      ))}
      {(any || groups.size === 0) && (
        <Card title="Vitals from Visit Notes" icon="bi-activity">
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
            <Note>No flowsheet entries or vital signs documented in this chart.</Note>
          )}
        </Card>
      )}
    </div>
  );
}

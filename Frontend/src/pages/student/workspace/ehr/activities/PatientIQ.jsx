import { useState } from 'react';
import { parseDate } from '../chart-review/chartReviewData.js';
import { sectionsMatching, visitSections } from '../lib/chartText.js';
import { ActivityHeader, Card, EhrTable, Note, ReportView } from '../ui/index.js';

const PATIENT_REPORTED = /REVIEW OF SYSTEMS|\bROS\b|SOCIAL|FAMILY|CHIEF COMPLAINT|HISTORY OF PRESENT|PATIENT.REPORTED|QUESTIONNAIRE|PAIN/i;

const SECTIONS = [
  { key: 'outcomeScores', name: 'Scores & Recovery', columns: { date: 'Date', measure: 'Measure', domain: 'Domain', score: 'Score', scale: 'Scale', milestone: 'Milestone', episode: 'Episode' } },
  { key: 'outcomeForms', name: 'Questionnaires & Forms', columns: { name: 'Form', date: 'Date', status: 'Status', episode: 'Episode', responses: 'Responses' } },
  { key: 'episodes', name: 'Care Episodes', columns: { name: 'Episode', type: 'Type', status: 'Status', start: 'Start', end: 'End', provider: 'Provider', note: 'Notes' } },
  { key: 'outcomeTasks', name: 'Tasks', columns: { name: 'Task', due: 'Due', status: 'Status', assignedTo: 'Assigned To', episode: 'Episode', detail: 'Details' } },
  { key: 'outcomeMessages', name: 'Messages', columns: { subject: 'Subject', date: 'Date', from: 'From', to: 'To', episode: 'Episode', body: 'Message' } },
];

export function PatientIQ({ chart, docs, find }) {
  const [active, setActive] = useState(SECTIONS[0]);
  const [measure, setMeasure] = useState('');
  const clinical = chart.clinical || {};
  const rows = active.key === 'episodes' ? chart.episodes || [] : clinical[active.key] || [];
  const showScores = active.key === 'outcomeScores';
  const measures = showScores ? [...new Set(rows.map((row) => row.measure).filter(Boolean))] : [];
  const selectedMeasure = measures.includes(measure) ? measure : '';
  const records = showScores
    ? rows.filter((row) => !selectedMeasure || row.measure === selectedMeasure)
      .sort((a, b) => (parseDate(b.date)?.getTime() ?? Number.MIN_SAFE_INTEGER) - (parseDate(a.date)?.getTime() ?? Number.MIN_SAFE_INTEGER))
    : rows;
  const history = sectionsMatching(visitSections(docs), PATIENT_REPORTED);

  return (
    <div className="ehr-act">
      <ActivityHeader title="PatientIQ" sub="Patient-reported outcomes documented in this chart" />
      <Note>Survey scores provide clinical context. Use documented diagnoses when assigning diagnosis codes.</Note>
      <div className="ehr-subtabs" role="group" aria-label="Patient outcomes views">
        {SECTIONS.map((section) => (
          <button key={section.key} type="button" aria-pressed={active === section} className={active === section ? 'on' : ''} onClick={() => setActive(section)}>
            {section.name}
          </button>
        ))}
      </div>
      <Card title={active.name}>
        {measures.length > 1 && (
          <label>
            Measure{' '}
            <select value={selectedMeasure} onChange={(event) => setMeasure(event.target.value)}>
              <option value="">All measures</option>
              {measures.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
        )}
        <EhrTable cols={Object.values(active.columns)} count={records.length} empty="No records documented in this chart.">
          {records.map((record, index) => (
            <tr key={index}>
              {Object.keys(active.columns).map((field) => <td key={field}>{record[field] ?? '—'}</td>)}
            </tr>
          ))}
        </EhrTable>
      </Card>
      <Card title="Patient-reported history" icon="bi-chat-square-quote">
        {history.length ? <ReportView sections={history} find={find} /> : <Note>No related history documented in this chart.</Note>}
      </Card>
    </div>
  );
}

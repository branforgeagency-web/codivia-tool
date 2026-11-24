import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../../routes/paths.js';

// Admin: one chart with its record and answer key. "Edit chart" opens it in the Upload form
// (edit mode, /admin/upload?chart=ID).
export function AdminChartView({ chart, onClose }) {
  const navigate = useNavigate();
  return (
    <div
      className="result-overlay"
      onClick={(ev) => {
        if (ev.target.className === 'result-overlay') onClose();
      }}
    >
      <div className="result-card" style={{ maxWidth: 820, width: '94%', maxHeight: '88vh' }}>
        <div
          className="card-h"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
        >
          <div>
            <h3>{chart.title}</h3>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {chart.id +
                ' · ' +
                chart.deptName +
                ' · ' +
                chart.patient.name +
                ' (' +
                chart.patient.sex +
                ' ' +
                chart.patient.age +
                'y) · ' +
                (chart.encounterType
                  ? (chart.encounterType === 'IP' ? 'IP – Inpatient' : 'OP – Outpatient') + (chart.billingType ? ' (' + chart.billingType + ')' : '')
                  : 'Encounter type not set')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={() => {
                onClose();
                navigate(PATHS.adminUpload + '?chart=' + encodeURIComponent(chart.id));
              }}
            >
              <i className="bi bi-pencil" aria-hidden="true" /> Edit chart
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div style={{ padding: '16px', overflowY: 'auto', maxHeight: '72vh' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--teal-d)',
              textTransform: 'uppercase',
              letterSpacing: '.5px',
              marginBottom: 8,
            }}
          >
            Medical Record
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: 13,
              lineHeight: 1.5,
              background: 'var(--tone-f8fafa)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: 14,
              margin: 0,
            }}
          >
            {chart.record}
          </pre>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--teal-d)',
              textTransform: 'uppercase',
              letterSpacing: '.5px',
              margin: '18px 0 8px',
            }}
          >
            Answer Key
          </div>
          <table>
            <thead>
              <tr>
                {['Code', 'Description', 'Type'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.answerKey.map((a, i) => (
                <tr key={i}>
                  <td>
                    <b style={{ color: 'var(--teal-d)' }}>{a.code}</b>
                  </td>
                  <td>{a.desc}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                      {a.type === 'PDx' ? (chart.encounterType === 'IP' ? 'PDx · Principal' : chart.encounterType === 'OP' ? 'PDx · Primary' : 'PDx') : a.type}
                      {a.uncertain ? ' · uncertain' : ''}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

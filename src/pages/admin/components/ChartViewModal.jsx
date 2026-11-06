export function AdminChartView({ chart, onClose }) {
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
                'y)'}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
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
                      {a.type}
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

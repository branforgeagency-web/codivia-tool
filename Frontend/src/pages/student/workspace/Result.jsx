/* CODIVIA workspace — scored result: accuracy ring + every check with the reason. */
import { fmtTime } from './model.js';

export function ResultView({ result, title, time, certificate, onReview, onBack, onNext }) {
  const cls = result.accuracy >= 90 ? 'hi' : result.accuracy >= 70 ? 'mid' : 'lo';
  return (
    <div className="wsx-res">
      <div className="card">
        <div className="rhead">
          <div className={'wsx-ring ' + cls}>{result.accuracy}%</div>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>{title}</h1>
            <div className="muted">
              {result.correct} of {result.total} checks correct · Time on chart {fmtTime(time)}
              {result.drgKey ? ` · Audited MS-DRG ${result.drgKey.code}${result.drgOk ? ' ✓' : ''}` : ''}
            </div>
            {certificate && (
              <div className="pill ok" style={{ marginTop: 8 }}>
                🎓 Certificate earned — {certificate.deptName || certificate.dept}
              </div>
            )}
          </div>
        </div>
        {(result.checks || []).map((c, i) => (
          <div key={i} className="wsx-chk">
            <span className={'i ' + (c.ok ? 'y' : 'n')}>{c.ok ? '✓' : '✕'}</span>
            <div>
              <b>{c.title}</b>
              {c.why && <p>{c.why}</p>}
            </div>
          </div>
        ))}
        <div className="mf">
          <button type="button" className="btn" onClick={onReview}>
            Review my work
          </button>
          <button type="button" className="btn" onClick={onBack}>
            Back to queue
          </button>
          {onNext && (
            <button type="button" className="btn primary" onClick={onNext}>
              Next chart ▸
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

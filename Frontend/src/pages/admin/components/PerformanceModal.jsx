import { DEPTS } from '../../../config/constants.js';

// Full performance breakdown for one student: score band distribution,
// per-department accuracy, weakest codes, and a chart-by-chart list.
export function AdminPerformance({ student, onClose }) {
  const r = student.results || {};
  const ids = Object.keys(r).sort((a, b) => (r[b].at || 0) - (r[a].at || 0));
  const scored = ids.filter((id) => typeof r[id].accuracy === 'number');
  const avg = scored.length
    ? Math.round(scored.reduce((a, id) => a + r[id].accuracy, 0) / scored.length)
    : null;

  const bands = { ship: 0, solid: 0, polish: 0, weak: 0 };
  scored.forEach((id) => {
    const a = r[id].accuracy;
    if (a >= 90) bands.ship++;
    else if (a >= 75) bands.solid++;
    else if (a >= 50) bands.polish++;
    else bands.weak++;
  });

  const perDept = {};
  ids.forEach((id) => {
    const v = r[id];
    const dk = v.dept || '?';
    if (!perDept[dk]) perDept[dk] = { n: 0, sum: 0 };
    perDept[dk].n++;
    if (typeof v.accuracy === 'number') perDept[dk].sum += v.accuracy;
  });

  // codes the student misses most often
  const missCount = {};
  ids.forEach((id) => {
    (r[id].miss || []).forEach((c) => {
      missCount[c] = (missCount[c] || 0) + 1;
    });
  });
  const topMiss = Object.entries(missCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const wrongCount = {};
  ids.forEach((id) => {
    (r[id].wrong || []).forEach((w) => {
      const k = w[0] + (w[1] ? ' \u2192 ' + w[1] : '');
      wrongCount[k] = (wrongCount[k] || 0) + 1;
    });
  });
  const topWrong = Object.entries(wrongCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const band = (a) => (a >= 90 ? 'var(--tone-0e7c66)' : a >= 75 ? 'var(--tone-2f855a)' : a >= 50 ? 'var(--tone-b7791f)' : 'var(--tone-b4232a)');
  const box = (label, val, color) => (
    <div style={{ minWidth: 96 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.04em', color: 'var(--muted)' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'inherit' }}>{val}</div>
    </div>
  );

  return (
    <div
      className="result-overlay"
      onClick={(ev) => {
        if (ev.target.className === 'result-overlay') onClose();
      }}
    >
      <div className="result-card" style={{ maxWidth: 860, maxHeight: '86vh', overflowY: 'auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{student.name}</h2>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
              {student.id + (student.email ? ' \u00b7 ' + student.email : '')}
            </div>
          </div>
          <button
            className="btn"
            style={{ background: 'var(--color-white)', border: '1px solid var(--line)' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {ids.length === 0 ? (
          <div style={{ padding: '22px 4px', color: 'var(--muted)', fontSize: 13 }}>
            {student.progressError
              ? 'Progress could not be read: ' + student.progressError
              : 'This student has not completed any charts yet.'}
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'flex',
                gap: 22,
                flexWrap: 'wrap',
                padding: '12px 0 16px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              {box('CHARTS DONE', ids.length)}
              {box(
                'AVG ACCURACY',
                avg === null ? '\u2014' : avg + '%',
                avg === null ? null : band(avg),
              )}
              {box('90%+', bands.ship, 'var(--tone-0e7c66)')}
              {box('75\u201389%', bands.solid, 'var(--tone-2f855a)')}
              {box('50\u201374%', bands.polish, 'var(--tone-b7791f)')}
              {box('UNDER 50%', bands.weak, 'var(--tone-b4232a)')}
            </div>
            <div style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>BY DEPARTMENT</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(perDept).map(([dk, v]) => {
                  const a = v.n ? Math.round(v.sum / v.n) : 0;
                  return (
                    <span
                      key={dk}
                      style={{
                        background: 'var(--teal-lt)',
                        borderRadius: 7,
                        padding: '6px 12px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: band(a),
                      }}
                    >
                      {(DEPTS[dk] ? DEPTS[dk].name : dk) +
                        ' \u00b7 ' +
                        v.n +
                        ' charts \u00b7 ' +
                        a +
                        '%'}
                    </span>
                  );
                })}
              </div>
            </div>
            {(topMiss.length > 0 || topWrong.length > 0) && (
              <div style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                  WHERE THEY LOSE MARKS
                </div>
                <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
                  {topMiss.length > 0 && (
                    <div style={{ minWidth: 250 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: 'var(--muted)',
                          marginBottom: 5,
                        }}
                      >
                        MOST OFTEN MISSED
                      </div>
                      {topMiss.map(([c, n]) => (
                        <div key={c} style={{ fontSize: 12.5, padding: '2px 0' }}>
                          <b>{c}</b>
                          <span style={{ color: 'var(--muted)' }}>
                            {' \u00b7 missed ' + n + '\u00d7'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {topWrong.length > 0 && (
                    <div style={{ minWidth: 250 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: 'var(--muted)',
                          marginBottom: 5,
                        }}
                      >
                        CODED INCORRECTLY
                      </div>
                      {topWrong.map(([c, n]) => (
                        <div key={c} style={{ fontSize: 12.5, padding: '2px 0' }}>
                          <b>{c}</b>
                          <span style={{ color: 'var(--muted)' }}>{' \u00b7 ' + n + '\u00d7'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div style={{ padding: '14px 0' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>CHART BY CHART</div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {ids.map((id) => {
                  const v = r[id];
                  return (
                    <div
                      key={id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '7px 0',
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      <div>
                        <b style={{ fontSize: 12.5 }}>{id}</b>
                        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
                          {(DEPTS[v.dept] ? DEPTS[v.dept].name : v.dept || '') +
                            (v.at ? ' \u00b7 ' + new Date(v.at).toLocaleDateString() : '')}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <b style={{ fontSize: 13, color: band(v.accuracy || 0) }}>
                          {(v.accuracy || 0) + '%'}
                        </b>
                        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
                          {(v.correct || 0) + '/' + (v.total || 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

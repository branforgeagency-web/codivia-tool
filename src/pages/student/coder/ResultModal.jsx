export function ResultModal({ result, chart, onRedo, onClose, saveState }) {
  const cls = result.accuracy >= 90 ? 'hi' : result.accuracy >= 75 ? 'mid' : 'lo';
  return (
    <div className="result-overlay">
      <div className="result-card">
        <div className="result-h">
          <div className={'score ' + cls}>{result.accuracy + '%'}</div>
          <div className="lbl">
            {result.correct.length + ' of ' + result.total + ' codes correct'}
          </div>
        </div>
        <div className="result-b">
          {result.pdgmKey && (
            <>
              <h4>PDGM Clinical Group</h4>
              <div className="rescode ok">
                <span className="c" style={{ minWidth: 'auto', padding: '2px 8px' }}>
                  🏠
                </span>
                <span>
                  {result.pdgmKey.code +
                    ' — this primary diagnosis maps to the above PDGM clinical grouping for the 30-day episode.'}
                </span>
              </div>
            </>
          )}
          {result.drgKey && (
            <>
              <h4>MS-DRG</h4>
              <div className={'rescode ' + (result.drgOk ? 'ok' : 'miss')}>
                <span className="c">{result.drgKey.code}</span>
                <span>
                  {result.drgOk
                    ? '✓ ' + result.drgKey.desc
                    : '✗ Correct DRG: ' +
                      result.drgKey.code +
                      ' — ' +
                      result.drgKey.desc +
                      (result.userDrg
                        ? ' (you chose ' + result.userDrg.split(' — ')[0] + ')'
                        : ' (none selected)')}
                </span>
              </div>
            </>
          )}
          {result.correct.length > 0 && (
            <>
              <h4>✓ Correct codes</h4>
              {result.correct.map((k, i) => (
                <div key={i}>
                  <div className="rescode ok">
                    <span className="c">{k.code}</span>
                    <span>{k.desc}</span>
                  </div>
                  {k.why && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--muted)',
                        lineHeight: 1.6,
                        margin: '-2px 0 10px 0',
                        padding: '7px 11px',
                        background: 'var(--tone-f6faf9)',
                        borderLeft: '3px solid var(--ok)',
                        borderRadius: '0 6px 6px 0',
                      }}
                    >
                      <b style={{ color: 'var(--ok)' }}>{'Why: '}</b>
                      {k.why}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          {result.missed.length > 0 && (
            <>
              <h4>✗ Missed — should have been coded</h4>
              {result.missed.map((k, i) => (
                <div key={i}>
                  <div className="rescode miss">
                    <span className="c">{k.code}</span>
                    <span>{k.desc}</span>
                  </div>
                  {k.why && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--ink)',
                        lineHeight: 1.6,
                        margin: '-2px 0 10px 0',
                        padding: '7px 11px',
                        background: 'var(--tone-fdf4f4)',
                        borderLeft: '3px solid var(--tone-b4232a)',
                        borderRadius: '0 6px 6px 0',
                      }}
                    >
                      <b style={{ color: 'var(--tone-b4232a)' }}>{'Why this code: '}</b>
                      {k.why}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          {result.wrong.length > 0 && (
            <>
              <h4>? Not in answer key</h4>
              {result.wrong.map((k, i) => {
                const sub = k.correctedTo;
                return (
                  <div key={i}>
                    <div className="rescode wrong">
                      <span className="c">{k.code || '(blank)'}</span>
                      <span>{k.desc || ''}</span>
                    </div>
                    {sub && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: 'var(--ink)',
                          lineHeight: 1.6,
                          margin: '-2px 0 10px 0',
                          padding: '8px 11px',
                          background: 'var(--tone-fff8ec)',
                          borderLeft: '3px solid var(--mod)',
                          borderRadius: '0 6px 6px 0',
                        }}
                      >
                        <div style={{ marginBottom: 4 }}>
                          <b style={{ color: 'var(--tone-9a6b12)' }}>
                            {'You coded ' +
                              k.code +
                              ' \u2014 the audited code is ' +
                              sub.code +
                              '.'}
                          </b>
                        </div>
                        <div>{sub.why || sub.desc}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div className="result-actions" style={{ alignItems: 'center' }}>
          {saveState === 'error' ? (
            <span style={{ marginRight: 'auto', fontSize: 12, fontWeight: 800, color: 'var(--tone-b4232a)' }}>
              Not saved — check your connection and submit again.
            </span>
          ) : (
            <span style={{ marginRight: 'auto', fontSize: 12, fontWeight: 800, color: 'var(--tone-0e7c66)' }}>
              {saveState === 'saving' ? 'Saving\u2026' : 'Result saved \u2713'}
            </span>
          )}
          <button
            style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            onClick={onRedo}
          >
            Try Again
          </button>
          <button style={{ background: 'var(--teal)', color: 'var(--color-white)' }} onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

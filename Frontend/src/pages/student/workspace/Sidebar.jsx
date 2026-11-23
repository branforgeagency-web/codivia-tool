/* CODIVIA workspace — right sidebar: edits (errors / warnings / prompts), queries, notes, activity. */
import { useState } from 'react';
import { Burger } from './Documents.jsx';

export function Sidebar({ open, setOpen, edits, acks, toggleAck, tabName, currentTab, goTab, queries, notes, setNotes, activity, onComment }) {
  const [filter, setFilter] = useState('all');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const n = (s) => edits.filter((e) => e.sev === s).length;
  if (!open)
    return (
      <div className="wsx-docrail right">
        <Burger open={false} what="edits & scrubber" count={n('err') || n('warn')} tone={n('err') ? 'err' : n('warn') ? 'warn' : ''} onClick={() => setOpen(true)} />
        {!n('err') && !n('warn') && <span className="okdot" title="No errors or warnings">✓</span>}
        <span className="lbl" aria-hidden="true">Edits &amp; scrubber</span>
      </div>
    );
  const shown = edits.filter((e) => filter === 'all' || e.sev === filter);
  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onComment(text.trim());
      setText('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card panel">
      <div className="ph">
        <Burger open={true} what="edits & scrubber" onClick={() => setOpen(false)} />
        <h2>Edits &amp; scrubber</h2>
      </div>
      <div className="wsx-efilters" role="group" aria-label="Filter edits">
        {[['all', 'All', edits.length], ['err', 'Errors', n('err')], ['warn', 'Warnings', n('warn')], ['info', 'Prompts', n('info')]].map(([k, l, c]) => (
          <button key={k} type="button" className={'chipf' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>
            {l} {c}
          </button>
        ))}
      </div>
      <div className="pb">
        {shown.length ? (
          shown.map((e) => {
            const acked = e.sev === 'warn' && acks.includes(e.key);
            return (
              <div key={e.key} className={'wsx-edit ' + e.sev + (acked ? ' acked' : '')}>
                <div className="eh">
                  {e.sev === 'err' ? '⛔ Error' : e.sev === 'warn' ? '⚠ Warning' : 'ⓘ Prompt'}
                  <span style={{ marginLeft: 'auto' }} className="pill gray">
                    {e.line ? 'Line ' + e.line : tabName(e.tab)}
                  </span>
                </div>
                <div className="eb">
                  <div className="rule">{e.src}</div>
                  <b>{e.title}</b>
                  <div>{e.msg}</div>
                </div>
                {(e.sev === 'warn' || (goTab && currentTab !== e.tab)) && (
                  <div className="ef">
                    {goTab && currentTab !== e.tab && (
                      <button type="button" className="btn sm" onClick={() => goTab(e.tab)}>
                        Go to {tabName(e.tab)}
                      </button>
                    )}
                    {e.sev === 'warn' && (
                      <button type="button" className="btn sm" onClick={() => toggleAck(e.key)}>
                        {acked ? '✓ Reviewed' : 'Mark reviewed'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="wsx-clean">✓ Nothing here. {filter === 'all' ? 'Ready to submit.' : ''}</div>
        )}

        <div className="ph" style={{ borderTop: '1px solid var(--w-line)' }}>
          <h2>Physician queries</h2>
        </div>
        {queries.length ? (
          queries.map((q) => (
            <div key={q.id} className={'wsx-q' + (q.answered ? ' ans' : '')}>
              <b>{q.answered ? '✓ Answered' : '⏳ Pending'}</b> · {q.to}
              <div style={{ marginTop: 4 }}>{q.question}</div>
              {q.answered ? (
                <div style={{ marginTop: 6 }}>
                  <b>Answer:</b> {q.answer}
                </div>
              ) : (
                <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                  The chart is on hold until the physician answers. The answer appears here as soon as it is sent.
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="wsx-act muted">No queries sent.</div>
        )}

        <div className="ph" style={{ borderTop: '1px solid var(--w-line)' }}>
          <h2>Coder notes</h2>
        </div>
        <div style={{ padding: '10px 13px' }}>
          <textarea className="inp" value={notes} maxLength={4000} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes for this chart (saved with your work)…" style={{ minHeight: 70 }} aria-label="Coder notes" />
        </div>

        <div className="ph" style={{ borderTop: '1px solid var(--w-line)' }}>
          <h2>Activity</h2>
        </div>
        {activity.length ? (
          activity
            .slice()
            .reverse()
            .map((a, i) => (
              <div key={i} className="wsx-act">
                <div className="t">{new Date(a.at).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                {a.text}
              </div>
            ))
        ) : (
          <div className="wsx-act muted">Nothing yet. Your work is saved as you go.</div>
        )}
        <div style={{ padding: '10px 13px' }}>
          <textarea className="inp" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder="Add a comment for the next person…" style={{ minHeight: 60 }} aria-label="Comment" />
          <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={send} disabled={!text.trim() || busy}>
            Add comment
          </button>
        </div>
      </div>
    </div>
  );
}

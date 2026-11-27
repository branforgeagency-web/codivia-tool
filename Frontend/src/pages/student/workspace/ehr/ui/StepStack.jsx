/* Vertical step list: one step under another. The open step shows its content (children); finished
   steps collapse to a one-line summary and can be reopened; later steps stay locked until the steps
   before them are done.
   steps: [{ key, label, state: 'done' | 'open' | 'locked' | 'off', count, summary, bad, lockedText }] */
export function StepStack({ steps, active, onOpen, children }) {
  return (
    <ol className="ehr-steps" aria-label="Coding steps">
      {steps.map((s, i) => {
        const isOpen = s.key === active;
        const clickable = s.state !== 'locked' && s.state !== 'off' && !isOpen;
        return (
          <li
            key={s.key}
            className={'ehr-step ' + s.state + (isOpen ? ' current' : '') + (s.bad ? ' bad' : '')}
          >
            <button
              type="button"
              className="ehr-step-h"
              aria-expanded={isOpen}
              aria-disabled={s.state === 'locked'}
              disabled={!clickable}
              title={s.state === 'locked' ? s.lockedText : 'Alt+' + (i + 1)}
              onClick={() => clickable && onOpen(s.key)}
            >
              <span className="num">
                {s.state === 'done' && !isOpen ? <i className="bi bi-check-lg" /> : i + 1}
              </span>
              <span className="lbl">{s.label}</span>
              {s.count > 0 && <span className="cnt">{s.count}</span>}
              {s.bad && <span className="cnt err">!</span>}
              {!isOpen && s.state !== 'locked' && s.summary && (
                <span className="sum">{s.summary}</span>
              )}
              {s.state === 'locked' && <span className="sum">{s.lockedText}</span>}
              {s.state === 'locked' && <i className="bi bi-lock-fill lock" aria-label="Locked" />}
              {clickable && <i className="bi bi-chevron-down chev" aria-hidden="true" />}
            </button>
            {isOpen && <div className="ehr-step-body">{children}</div>}
          </li>
        );
      })}
    </ol>
  );
}

/* CODIVIA workspace — the auditor's review of the student's submitted chart (chart.result.audit):
   official (audited) score vs the automatic one, findings and feedback. Shown above the workspace
   while the chart is open and the student hasn't just re-submitted it. Styles: .au-fb-* in refinements.css */
import { useState } from 'react';

export function AuditFeedback({ audit }) {
  const [open, setOpen] = useState(true);
  if (!audit) return null;
  const adjusted = audit.verdict === 'adjusted' && audit.finalAccuracy !== audit.autoAccuracy;
  return (
    <section className="au-fb" aria-label="Auditor review">
      <button type="button" className="au-fb-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <i className="bi bi-clipboard-check" aria-hidden="true" />
        <b>Audited by {audit.auditorName}</b>
        <span>
          {adjusted ? (
            <>
              Score adjusted <s>{audit.autoAccuracy}%</s> → <b>{audit.finalAccuracy}%</b>
            </>
          ) : (
            <>Auditor agreed with your score of {audit.finalAccuracy}%</>
          )}
          {audit.at ? ' · ' + new Date(audit.at).toLocaleDateString() : ''}
        </span>
        <i className={'bi ' + (open ? 'bi-chevron-up' : 'bi-chevron-down')} aria-hidden="true" />
      </button>
      {open && (
        <div className="au-fb-body">
          {audit.feedback && <p className="au-fb-text">{audit.feedback}</p>}
          {(audit.findings || []).length > 0 && (
            <ul className="au-fb-list">
              {audit.findings.map((f, i) => (
                <li key={i}>
                  {f.code && <b className="as-mono">{f.code}</b>} <span className="dc-badge warn">{f.label || f.type}</span>
                  {f.comment && <p>{f.comment}</p>}
                </li>
              ))}
            </ul>
          )}
          {!audit.feedback && !(audit.findings || []).length && <p className="au-fb-text">No findings — well coded.</p>}
          <p className="au-fb-note">Submitting this chart again replaces this score; the new submission goes back to your auditor.</p>
        </div>
      )}
    </section>
  );
}

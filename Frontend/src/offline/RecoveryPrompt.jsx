/* CODIVIA offline — offer back work that was saved on this device but never reached the server
 * (power cut, crash, closed while offline).
 *   <RecoveryPrompt local={record} labels={labels} onRestore={…} onDiscard={…} />
 * `local` is the device copy (draftStore record). Wording from the server. Styles: .ofl-recover */
import { useState } from 'react';
import { clockTime, fillLabel } from './format.js';

export function RecoveryPrompt({ local, labels = {}, onRestore, onDiscard }) {
  const [busy, setBusy] = useState(false);
  if (!local) return null;
  const when = new Date(local.localAt);
  const time = when.toDateString() === new Date().toDateString() ? clockTime(when) : when.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const act = (fn) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ofl-recover" role="alertdialog" aria-labelledby="ofl-recover-title">
      <i className="bi bi-life-preserver" aria-hidden="true" />
      <div className="ofl-recover-text">
        <b id="ofl-recover-title">{labels.recoveryTitle}</b>
        <span>{fillLabel(labels.recoveryBody, { time })}</span>
      </div>
      <div className="ofl-recover-acts">
        <button type="button" className="btn sm" onClick={act(onDiscard)} disabled={busy}>
          {labels.recoveryDiscard}
        </button>
        <button type="button" className="btn sm primary" onClick={act(onRestore)} disabled={busy}>
          {labels.recoveryRestore}
        </button>
      </div>
    </div>
  );
}

/* CODIVIA offline — the save status shown in the workspace header.
 *   <SyncStatus sync={sync} labels={chart.draftSync.labels} onRetry={sync.flush} />
 * Wording comes from the server (config/drafts.js → labels). Styles: .ofl-status in offline.css */
import { clockTime, fillLabel } from './format.js';

const TONE = { saved: 'ok', saving: 'busy', local: 'busy', offline: 'warn', retrying: 'warn', failed: 'err', idle: '' };
const ICON = { saved: 'bi-cloud-check', saving: 'bi-arrow-repeat', local: 'bi-device-hdd', offline: 'bi-wifi-off', retrying: 'bi-arrow-clockwise', failed: 'bi-exclamation-triangle', idle: 'bi-cloud' };

export function SyncStatus({ sync, labels = {}, onRetry }) {
  const { state, savedAt, retryIn, error } = sync;
  const key = state === 'idle' && savedAt ? 'saved' : state;
  const text = fillLabel(labels[key] || labels.idle, { time: clockTime(savedAt), seconds: retryIn, message: error });
  return (
    <span className={'ofl-status ' + (TONE[key] || '')} role="status" aria-live="polite" title={savedAt ? 'Last saved to the server ' + clockTime(savedAt) : ''}>
      <i className={'bi ' + (ICON[key] || ICON.idle) + (key === 'saving' ? ' ofl-spin' : '')} aria-hidden="true" />
      {text}
      {(key === 'retrying' || key === 'failed') && onRetry && (
        <button type="button" className="ofl-retry" onClick={onRetry}>
          Retry now
        </button>
      )}
    </span>
  );
}

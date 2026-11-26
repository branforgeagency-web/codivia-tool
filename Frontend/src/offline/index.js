/* CODIVIA offline — offline-safe saving for the coding workspace.
 *
 *   db.js              IndexedDB wrapper (in-memory fallback)
 *   draftStore.js      device copies of drafts per user + chart; recovery decision; cleanup
 *   useDraftSync.js    device copy on every change → server sync → retry / reconnect / keepalive on close
 *   useUnsavedGuard.js "Leave site?" warning while changes are not on the server
 *   SyncStatus.jsx     header save status ("Saved", "Offline — saved on this device", "Retrying in 5s")
 *   OfflineBanner.jsx  banner while offline (submitting paused)
 *   RecoveryPrompt.jsx "Unsaved work found on this device — Restore / Discard"
 *   offline.css        styles for the three components
 *
 * Timing and wording come from the server: chart.draftSync (backend/src/config/drafts.js).
 */
import './offline.css';

export { useDraftSync } from './useDraftSync.js';
export { useUnsavedGuard } from './useUnsavedGuard.js';
export { SyncStatus } from './SyncStatus.jsx';
export { OfflineBanner } from './OfflineBanner.jsx';
export { RecoveryPrompt } from './RecoveryPrompt.jsx';
export { clearLocalDraft, clearLocalDrafts, loadLocalDraft, shouldOfferRecovery } from './draftStore.js';
export { fillLabel } from './format.js';

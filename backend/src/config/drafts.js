// Workspace draft saving (offline-safe). Sent to the browser with each chart (GET /my-charts/:dept/charts/:id
// → draftSync) so timing and wording are changed here, not in the frontend.
//
// The browser keeps a copy of the draft on the device (IndexedDB) on every change and syncs it to the
// server after `saveDelayMs`. A failed sync is retried on the `retryDelaysMs` schedule (the last delay
// repeats) and at once when the connection comes back. Device copies older than `keepLocalDays` are removed.

const DRAFT_SYNC = Object.freeze({
  saveDelayMs: 1200,
  retryDelaysMs: Object.freeze([2000, 5000, 15000, 30000, 60000]),
  keepLocalDays: 14,
  labels: Object.freeze({
    idle: 'Autosave on',
    saving: 'Saving…',
    saved: 'Draft saved {time}',
    local: 'Saved on this device — syncing…',
    offline: 'Offline — saved on this device',
    retrying: 'Not synced — retrying in {seconds}s',
    failed: 'Not saved — {message}',
    offlineBanner: 'You are offline. Your work is saved on this device and will sync when the connection is back. Submitting is paused until then.',
    submitOffline: 'You are offline — reconnect to submit this chart.',
    recoveryTitle: 'Unsaved work found on this device',
    recoveryBody: 'This device has changes from {time} that did not reach the server (for example after a power cut or lost connection).',
    recoveryRestore: 'Restore my work',
    recoveryDiscard: 'Discard',
    leaveWarning: 'Some changes have not reached the server yet. Leave anyway?',
  }),
});

module.exports = { DRAFT_SYNC };

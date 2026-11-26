/* CODIVIA offline — device copies of workspace drafts.
 *
 * One record per (user, chart), stored in IndexedDB ('drafts'):
 *   { userId, chartId, deptKey, draft, timeSpent, localAt, serverSavedAt }
 *     localAt        - when this copy was written on the device (ms)
 *     serverSavedAt  - the server's savedAt the copy was based on (ms), for recovery decisions
 * Records are keyed per user, so on a shared PC one student never sees another's work.
 */
import { idbDelete, idbEntries, idbGet, idbPut } from './db.js';

const STORE = 'drafts';
const keyOf = (userId, chartId) => `${userId}::${chartId}`;
const DAY_MS = 24 * 60 * 60 * 1000;

export const saveLocalDraft = (rec) => idbPut(STORE, keyOf(rec.userId, rec.chartId), { ...rec, localAt: rec.localAt || Date.now() });

export const loadLocalDraft = (userId, chartId) => idbGet(STORE, keyOf(userId, chartId)).catch(() => null);

export const clearLocalDraft = (userId, chartId) => idbDelete(STORE, keyOf(userId, chartId)).catch(() => {});

// Every device copy of one user (sign-out), or only those older than `maxAgeDays` (housekeeping).
export async function clearLocalDrafts(userId, { maxAgeDays } = {}) {
  try {
    const cutoff = maxAgeDays ? Date.now() - maxAgeDays * DAY_MS : Infinity;
    const entries = await idbEntries(STORE);
    await Promise.all(
      entries
        .filter(([, rec]) => rec && (!userId || rec.userId === userId) && (rec.localAt || 0) < cutoff)
        .map(([key]) => idbDelete(STORE, key)),
    );
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

/* Should the device copy be offered back when a chart opens?
 *   serverWork: the chart's work from the API ({ draft, savedAt, submittedAt }).
 * Offer it only when it is newer than what the server has and actually differs from it. */
export function shouldOfferRecovery(local, serverWork) {
  if (!local || !local.draft) return false;
  const serverAt = serverWork && serverWork.savedAt ? new Date(serverWork.savedAt).getTime() : 0;
  const submittedAt = serverWork && serverWork.submittedAt ? new Date(serverWork.submittedAt).getTime() : 0;
  if (local.localAt <= Math.max(serverAt, submittedAt)) return false;
  return JSON.stringify(local.draft) !== JSON.stringify((serverWork && serverWork.draft) || null);
}

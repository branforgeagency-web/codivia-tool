/* CODIVIA offline — offline-safe autosave for a workspace draft.
 *
 *   const sync = useDraftSync({
 *     userId, chartId, deptKey,
 *     draft,                       // current draft (state)
 *     enabled,                     // false until the draft is loaded (no save on first render)
 *     settings,                    // chart.draftSync from the API: { saveDelayMs, retryDelaysMs, keepLocalDays, labels }
 *     getTimeSpent,                // () => seconds on this chart
 *     serverSavedAt,               // chart.work.savedAt (what the device copy is based on)
 *     send: (draft, timeSpent, fetchOptions) => Promise<{ savedAt }>,   // the server save (PUT …/work)
 *   });
 *   sync.state      'idle' | 'local' | 'saving' | 'saved' | 'offline' | 'retrying' | 'failed'
 *   sync.savedAt    Date of the last server save · sync.retryIn seconds to the next retry · sync.error
 *   sync.unsynced   true while the device has changes the server doesn't
 *   await sync.flush()   save now (before leaving, defer, submit …); resolves true when the server has it
 *   await sync.discardLocal()   forget the device copy (after a submit)
 *
 * Every change is written to the device at once (IndexedDB), then sent to the server after
 * settings.saveDelayMs. A failed send retries on settings.retryDelaysMs (the last delay repeats) and
 * immediately when the browser comes back online or the tab becomes visible. On tab close a final
 * send uses fetch keepalive so it can finish after the page is gone.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { clearLocalDraft, clearLocalDrafts, saveLocalDraft } from './draftStore.js';
import { requestPersistentStorage } from './db.js';

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
// Client errors (bad request, not found …) won't succeed on retry; network / server errors might.
const retryable = (e) => !e || !e.status || e.status >= 500 || e.status === 408 || e.status === 429;

export function useDraftSync({ userId, chartId, deptKey, draft, enabled, settings, getTimeSpent, serverSavedAt, send }) {
  const [state, setState] = useState('idle');
  const [savedAt, setSavedAt] = useState(serverSavedAt ? new Date(serverSavedAt) : null);
  const [retryIn, setRetryIn] = useState(0);
  const [error, setError] = useState('');
  const [unsynced, setUnsynced] = useState(false);

  // Mutable sync bookkeeping (not render state).
  const r = useRef({ version: 0, sentVersion: 0, inFlight: null, attempt: 0, saveTimer: 0, retryTimer: 0, countdown: 0, serverSavedAt: null });
  const latest = useRef({});
  latest.current = { userId, chartId, deptKey, draft, settings, getTimeSpent, send };

  useEffect(() => {
    r.current.serverSavedAt = serverSavedAt ? new Date(serverSavedAt).getTime() : null;
  }, [serverSavedAt]);

  const clearTimers = () => {
    clearTimeout(r.current.saveTimer);
    clearTimeout(r.current.retryTimer);
    clearInterval(r.current.countdown);
  };

  // Send the current draft to the server. Concurrent calls share one request.
  const syncNow = useCallback(async (fetchOptions) => {
    const s = r.current;
    const { draft: d, getTimeSpent: t, send: sendFn, userId: u, chartId: c, settings: cfg } = latest.current;
    if (!d || s.version === s.sentVersion) return true;
    if (s.inFlight) return s.inFlight;
    if (isOffline() && !(fetchOptions && fetchOptions.keepalive)) {
      setState('offline');
      return false;
    }
    clearTimers();
    const version = s.version;
    setState('saving');
    s.inFlight = (async () => {
      try {
        const res = await sendFn(d, t(), fetchOptions);
        s.sentVersion = version;
        s.attempt = 0;
        s.serverSavedAt = res && res.savedAt ? new Date(res.savedAt).getTime() : Date.now();
        setSavedAt(new Date(s.serverSavedAt));
        setError('');
        setRetryIn(0);
        if (s.version === version) {
          // Nothing changed while sending: the server has everything, the device copy can go.
          setUnsynced(false);
          setState('saved');
          await clearLocalDraft(u, c);
        } else {
          // The draft changed while this request was out: send the newer version too.
          setState('local');
          s.saveTimer = setTimeout(() => syncNow(), (cfg && cfg.saveDelayMs) || 0);
        }
        return true;
      } catch (e) {
        const offline = isOffline() || !e || !e.status;
        if (!retryable(e)) {
          setState('failed');
          setError((e && e.message) || 'save failed');
          return false;
        }
        // Schedule the next attempt (the last delay repeats); count down for the status line.
        const delays = (cfg && cfg.retryDelaysMs) || [];
        const wait = delays.length ? delays[Math.min(s.attempt, delays.length - 1)] : 0;
        s.attempt += 1;
        setState(offline ? 'offline' : 'retrying');
        if (wait) {
          const due = Date.now() + wait;
          setRetryIn(Math.ceil(wait / 1000));
          s.countdown = setInterval(() => setRetryIn(Math.max(0, Math.ceil((due - Date.now()) / 1000))), 1000);
          s.retryTimer = setTimeout(() => syncNow(), wait);
        }
        return false;
      } finally {
        s.inFlight = null;
      }
    })();
    return s.inFlight;
  }, []);

  // Every change: device copy now, server after the save delay.
  useEffect(() => {
    if (!enabled || !draft) return undefined;
    const s = r.current;
    s.version += 1;
    setUnsynced(true);
    const { userId: u, chartId: c, deptKey: dk, getTimeSpent: t, settings: cfg } = latest.current;
    saveLocalDraft({ userId: u, chartId: c, deptKey: dk, draft, timeSpent: t(), serverSavedAt: s.serverSavedAt }).catch(() => {});
    setState((prev) => (prev === 'saving' ? prev : isOffline() ? 'offline' : 'local'));
    clearTimeout(s.saveTimer);
    s.saveTimer = setTimeout(() => syncNow(), (cfg && cfg.saveDelayMs) || 0);
    return () => clearTimeout(s.saveTimer);
  }, [draft, enabled, syncNow]);

  // Back online / tab visible again → retry at once. Tab hidden → save now.
  useEffect(() => {
    const retryNow = () => {
      if (r.current.version === r.current.sentVersion) return;
      r.current.attempt = 0;
      syncNow();
    };
    const onVisibility = () => (document.visibilityState === 'visible' ? retryNow() : syncNow());
    window.addEventListener('online', retryNow);
    document.addEventListener('visibilitychange', onVisibility);
    const onOffline = () => r.current.version !== r.current.sentVersion && setState('offline');
    window.addEventListener('offline', onOffline);
    // Page being unloaded (tab closed, reload, power-off shutdown): last send with keepalive.
    const onPageHide = () => syncNow({ keepalive: true });
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('online', retryNow);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [syncNow]);

  // Housekeeping once per chart: keep the data on disk, drop old device copies.
  useEffect(() => {
    requestPersistentStorage();
    const days = settings && settings.keepLocalDays;
    if (userId && days) clearLocalDrafts(userId, { maxAgeDays: days });
  }, [userId, chartId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving the chart (route change): flush; timers stop.
  useEffect(
    () => () => {
      syncNow();
      clearTimers();
    },
    [chartId, syncNow],
  );

  const flush = useCallback(() => syncNow(), [syncNow]);
  const discardLocal = useCallback(async () => {
    r.current.sentVersion = r.current.version;
    setUnsynced(false);
    clearTimers();
    await clearLocalDraft(latest.current.userId, latest.current.chartId);
  }, []);

  return { state, savedAt, retryIn, error, unsynced, flush, discardLocal };
}

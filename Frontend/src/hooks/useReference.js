import { useEffect, useState } from 'react';
import { get } from '../services/apiHelper.js';
import { REFERENCE_WORK_QUEUE } from '../services/endpoints.js';

// Reference lists for the coding workspace and the admin upload (GET /reference/work-queue):
// { workTypes, poa, admitTypes, admitSources, dispositions, emLevels, emGrids, modifiers, drgs,
//   remitCodes, denialDecisions, deferReasons, transferQueues, transferReasons, queryOptions }
// Each list is [{ value, label, code?, desc?, meta? }]. Loaded once per page load and shared.
let pending = null;
let loaded = null;

export function loadReference() {
  if (loaded) return Promise.resolve(loaded);
  if (!pending) {
    pending = get(REFERENCE_WORK_QUEUE)
      .then((r) => (loaded = r))
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function useReference() {
  const [ref, setRef] = useState(loaded);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (loaded) return undefined;
    setError('');
    let live = true;
    loadReference()
      .then((r) => live && setRef(r))
      .catch((e) => live && setError(e.message || 'Could not load the reference lists.'));
    return () => {
      live = false;
    };
  }, [attempt]);
  return { ref, error, retry: () => setAttempt((n) => n + 1) };
}

// Display info for a work type key, from the workTypes list.
export function workTypeInfo(ref, key) {
  const item = ((ref && ref.workTypes) || []).find((t) => t.value === key) || { value: key, label: key, meta: {} };
  const meta = item.meta || {};
  return { key, label: item.label, hint: item.desc || '', act: meta.action || 'Open', panel: meta.panel || item.label, cls: meta.tone || 'navy', badge: meta.badge || '', inpatientOnly: !!meta.inpatientOnly };
}

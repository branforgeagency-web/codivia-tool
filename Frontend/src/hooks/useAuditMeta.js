import { useEffect, useState } from 'react';
import { get } from '../services/apiHelper.js';
import { AUDIT_META } from '../services/endpoints.js';

// Labels, options, thresholds and limits for the auditor pages (GET /audits/meta):
// { statuses: [{ key, label, tone }], queueTabs, verdicts: [{ key, label, hint }], findingTypes: [{ key, label }],
//   keyGroups: [{ key, label, types, field }], priorityBelow, limits: { findings, findingComment, feedback, code } }
// Loaded once per page load and shared, like useReference().
let pending = null;
let loaded = null;

export function loadAuditMeta() {
  if (loaded) return Promise.resolve(loaded);
  if (!pending) {
    pending = get(AUDIT_META)
      .then((r) => (loaded = r))
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function useAuditMeta() {
  const [meta, setMeta] = useState(loaded);
  useEffect(() => {
    if (loaded) return undefined;
    let live = true;
    loadAuditMeta()
      .then((m) => live && setMeta(m))
      .catch((e) => console.error('audit meta', e));
    return () => {
      live = false;
    };
  }, []);
  return meta;
}

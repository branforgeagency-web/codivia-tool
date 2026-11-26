/* CODIVIA — small pieces shared by the auditor pages. Labels come from the server:
   audit statuses from GET /audits/meta (useAuditMeta), work types from GET /reference/work-queue (useReference). */
import { useAuditMeta } from '../../hooks/useAuditMeta.js';
import { useReference, workTypeInfo } from '../../hooks/useReference.js';
import { accTone } from '../../utils/progress.js';

export const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// Readable name of a chart's work type (code, review, denial, drg …).
export function useWorkTypeLabel() {
  const { ref } = useReference();
  return (key) => (key ? workTypeInfo(ref, key).label : '');
}

// "78%" or "78% → 85%" once an audit adjusted it; tone by the official score.
export function ScorePill({ row }) {
  const adjusted = row.status === 'completed' && row.finalAccuracy != null && row.finalAccuracy !== row.autoAccuracy;
  const shown = row.status === 'completed' && row.finalAccuracy != null ? row.finalAccuracy : row.autoAccuracy;
  return (
    <span className={'au-score acc-' + accTone(shown)} title={adjusted ? `Auto ${row.autoAccuracy}% · audited ${row.finalAccuracy}%` : `Auto score ${row.autoAccuracy}%`}>
      {adjusted ? (
        <>
          <s>{row.autoAccuracy}%</s> → {row.finalAccuracy}%
        </>
      ) : (
        shown + '%'
      )}
    </span>
  );
}

export function StatusBadge({ status, priority }) {
  const meta = useAuditMeta();
  const s = ((meta && meta.statuses) || []).find((x) => x.key === status) || { label: status, tone: 'muted' };
  return (
    <span className="au-badges">
      <span className={'dc-badge ' + s.tone}>{s.label}</span>
      {priority && status !== 'completed' && (
        <span className="dc-badge danger" title={meta ? `Automatic score below ${meta.priorityBelow}%` : ''}>
          Priority
        </span>
      )}
    </span>
  );
}

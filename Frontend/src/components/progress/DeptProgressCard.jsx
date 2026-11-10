/* CODIVIA platform — one department's progress: icon, status, accuracy ring, charts worked,
   progress toward the certificate. Reusable anywhere per-department stats are shown.
   Props: deptKey (e.g. "CARDIO"), name, stats { worked, avg, certified }.
   Styles: .dp-* in styles/refinements.css */
import { DeptIcon } from '../ui/DeptIcon.jsx';
import { ProgressRing } from '../ui/ProgressRing.jsx';
import { accTone, certProgress, deptStatus } from '../../utils/progress.js';

const AWARD = 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.2 13.9 7 22l5-3 5 3-1.2-8.1';

export function DeptProgressCard({ deptKey, name, stats }) {
  const status = deptStatus(stats);
  const { pct, left, threshold } = certProgress(stats.worked);
  const worked = stats.worked > 0;
  const tone = worked ? accTone(stats.avg) : '';

  return (
    <article className={'dp-card ' + status.key}>
      <div className="dp-top">
        <span className="dp-ico">
          <DeptIcon dept={deptKey} />
        </span>
        <h3>{name}</h3>
        <span className={'dp-status ' + status.key}>{status.label}</span>
      </div>

      <div className="dp-metrics">
        <ProgressRing value={worked ? stats.avg : null} tone={tone} size={68} />
        <div className="dp-nums">
          <div>
            <b>{stats.worked}</b>
            <span>Charts worked</span>
          </div>
          <div>
            <b className={worked ? 'acc ' + tone : ''}>{worked ? stats.avg + '%' : '—'}</b>
            <span>Accuracy</span>
          </div>
        </div>
      </div>

      <div className="dp-cert">
        <span>
          Certificate <em>{stats.worked + ' / ' + threshold}</em>
        </span>
        <b>{pct}%</b>
      </div>

      <div className="dp-foot">
        {stats.certified ? (
          <>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
              <path d={AWARD} />
            </svg>
            Counts toward your certificate and resume.
          </>
        ) : (
          left + ' more chart' + (left === 1 ? '' : 's') + ' to unlock the certificate'
        )}
      </div>
    </article>
  );
}

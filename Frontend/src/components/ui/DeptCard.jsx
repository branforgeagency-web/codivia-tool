/* CODIVIA platform — department card shell: icon, name, optional meta line and badge,
 * any body content, and an optional footer. Build specific department cards on top of it.
 *
 * <DeptCard deptKey="CARDIO" name="Cardiology" meta="CARDIO · Specialty"
 *           badge={{ label: 'Available', tone: 'ok' }} footer={<button…/>}>
 *   …body…
 * </DeptCard>
 *
 * badge tones: ok | warn | danger | brand | muted. Styles: .dc-* in styles/refinements.css
 */
import { DeptIcon } from './DeptIcon.jsx';

export function DeptCard({ deptKey, name, meta, badge, footer, className = '', children }) {
  return (
    <article className={'dc-card ' + className}>
      <div className="dc-top">
        <span className="dc-ico" aria-hidden="true">
          <DeptIcon dept={deptKey} />
        </span>
        <div className="dc-title">
          <h3>{name}</h3>
          {meta && <span className="dc-meta">{meta}</span>}
        </div>
        {badge && <span className={'dc-badge ' + (badge.tone || 'muted')}>{badge.label}</span>}
      </div>
      {children}
      {footer && <div className="dc-foot">{footer}</div>}
    </article>
  );
}

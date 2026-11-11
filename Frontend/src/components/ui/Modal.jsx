/* CODIVIA platform — modal dialog shell: header (icon/avatar, title, subtitle, close), scrolling body,
 * fixed footer. Closes on Esc and on a click outside the card.
 *
 * <Modal title="Manage access" subtitle="STU-00001" icon={<span className="md-avatar">AS</span>}
 *        size="lg" onClose={close} footer={<button…/>}>
 *   …body…
 * </Modal>
 *
 * size: md (560px) | lg (760px) | xl (920px). closeButton={false} hides the ✕ (Esc / outside click still close).
 * Styles: .md-* in styles/refinements.css
 */
import { useEffect, useId } from 'react';

export function Modal({ title, subtitle, icon, size = 'md', onClose, footer, closeButton = true, children }) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (ev) => ev.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="md-overlay" onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}>
      <div className={'md-card ' + size} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="md-head">
          {icon}
          <div className="md-title">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <span>{subtitle}</span>}
          </div>
          {closeButton && (
            <button type="button" className="md-close" onClick={onClose} aria-label="Close">
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          )}
        </header>
        <div className="md-body">{children}</div>
        {footer && <footer className="md-foot">{footer}</footer>}
      </div>
    </div>
  );
}

// Initials avatar for a person, e.g. "Vikram Iyer" -> "VI".
export function Avatar({ name }) {
  const text =
    String(name || '')
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?';
  return (
    <span className="md-avatar" aria-hidden="true">
      {text}
    </span>
  );
}

/* CODIVIA platform — confirmation card with a warning, for destructive or account-changing actions.
 * Built on Modal. Handles the busy state and shows the server's error without closing.
 *
 * <ConfirmDialog
 *   title="Delete department" subtitle="CARDIO" icon={<span className="md-avatar">…</span>}
 *   tone="danger"                       // danger (red) | warn (amber) | ok (green): warning box + confirm button
 *   warning={<><b>Cardiology</b> will be removed. This cannot be undone.</>}
 *   confirmLabel="Delete department" busyLabel="Deleting…"
 *   typeToConfirm="CARDIO"              // optional: the admin must type this (case-insensitive) first
 *   onConfirm={() => del(...)}          // may return a promise; a rejection shows its message
 *   onDone={reload}                     // after a successful confirm, before closing
 *   secondary={{ label: 'Set inactive instead', onClick: () => patch(...) }}  // optional extra action
 *   onClose={close}
 * >
 *   …optional extra body…
 * </ConfirmDialog>
 *
 * Styles: .cf-* and .as-* in styles/refinements.css
 */
import { useState } from 'react';
import { Modal } from './Modal.jsx';

const TONE_ICON = {
  danger: 'bi-exclamation-octagon-fill',
  warn: 'bi-exclamation-triangle-fill',
  ok: 'bi-check-circle-fill',
};

export function ConfirmDialog({
  title,
  subtitle,
  icon,
  tone = 'danger',
  warning,
  confirmLabel = 'Confirm',
  busyLabel = 'Working…',
  cancelLabel = 'Cancel',
  typeToConfirm,
  onConfirm,
  onDone,
  secondary,
  onClose,
  children,
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const matches = !typeToConfirm || typed.trim().toUpperCase() === String(typeToConfirm).toUpperCase();

  const run = async (action) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
      onDone && onDone();
      onClose();
    } catch (e) {
      setError((e && e.message) || 'Could not complete the action.');
      setBusy(false);
    }
  };
  const confirm = () => matches && onConfirm && run(onConfirm);

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      icon={icon}
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="sc-ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          {secondary && (
            <button type="button" className="sc-ghost" onClick={() => run(secondary.onClick)} disabled={busy}>
              {secondary.label}
            </button>
          )}
          {onConfirm && (
            <button type="button" className={'dc-action cf-btn ' + tone} onClick={confirm} disabled={busy || !matches} autoFocus={!typeToConfirm}>
              {busy ? busyLabel : confirmLabel}
            </button>
          )}
        </>
      }
    >
      {warning && (
        <div className={'as-warn cf-warn ' + tone} role={tone === 'danger' ? 'alert' : undefined}>
          <i className={'bi ' + (TONE_ICON[tone] || TONE_ICON.warn)} aria-hidden="true" />
          <div>{warning}</div>
        </div>
      )}
      {children}
      {typeToConfirm && onConfirm && (
        <label className="as-field">
          <span>
            Type <b className="as-mono">{typeToConfirm}</b> to confirm
          </span>
          <input
            value={typed}
            autoFocus
            disabled={busy}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={typeToConfirm}
            onKeyDown={(e) => e.key === 'Enter' && confirm()}
          />
        </label>
      )}
      {error && (
        <div className="cvx-msg err" role="alert" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </Modal>
  );
}

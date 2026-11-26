import { useState } from 'react';
import { Avatar, Modal } from '../../../components/ui/Modal.jsx';
import { patch } from '../../../services/apiHelper.js';
import { ADMIN_AUDITOR, ADMIN_STUDENT } from '../../../services/endpoints.js';

// ---- Admin: edit a student's or auditor's name, email or password (user card → Edit). Styles: .md-* / .as-*
// role 'auditor' → PATCH /admin/auditors/:uid (response { auditor }).
// PATCH /admin/students/:uid { name?, email?, password? } -> { student }. Only changed fields are sent;
// a new password signs the student out of every device. ----

const PASSWORD_HINT = '8+ characters with an uppercase letter, a lowercase letter, a number and a special character.';

export function EditStudentForm({ student, role = 'student', onClose, onSaved }) {
  const isAuditor = role === 'auditor';
  const who = isAuditor ? 'auditor' : 'student';
  const [name, setName] = useState(student.name || '');
  const [email, setEmail] = useState(student.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const changes = {};
  if (name.trim() !== (student.name || '')) changes.name = name.trim();
  if (email.trim().toLowerCase() !== (student.email || '').toLowerCase()) changes.email = email.trim();
  if (password) changes.password = password;
  const dirty = Object.keys(changes).length > 0;

  const submit = async (ev) => {
    ev.preventDefault();
    if (busy || !dirty) return;
    setError('');
    setFieldErrors({});
    const errs = {};
    if (!name.trim()) errs.name = `Enter the ${who}’s name.`;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (Object.keys(errs).length) return setFieldErrors(errs);
    setBusy(true);
    try {
      const res = await patch(isAuditor ? ADMIN_AUDITOR(student.uid) : ADMIN_STUDENT(student.uid), changes);
      onSaved && onSaved(res[who], !!changes.password);
      onClose();
    } catch (e) {
      const details = (e.data && e.data.details) || [];
      if (details.length) setFieldErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      else setError(e.message || 'Could not save the changes.');
    }
    setBusy(false);
  };

  return (
    <Modal
      title={isAuditor ? 'Edit auditor' : 'Edit student'}
      subtitle={isAuditor ? student.email : student.id}
      icon={<Avatar name={student.name} />}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sc-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="edit-student-form" className="dc-action" disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id="edit-student-form" className="as-form" onSubmit={submit} noValidate>
        <label className="as-field">
          <span>Full name</span>
          <input value={name} maxLength={100} autoFocus onChange={(e) => setName(e.target.value)} aria-invalid={!!fieldErrors.name} />
          {fieldErrors.name && <em>{fieldErrors.name}</em>}
        </label>
        <label className="as-field">
          <span>Email</span>
          <input type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fieldErrors.email} />
          {fieldErrors.email && <em>{fieldErrors.email}</em>}
        </label>
        <label className="as-field">
          <span>New password</span>
          <div className="as-pw">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              autoComplete="new-password"
              maxLength={72}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep the current password"
              aria-invalid={!!fieldErrors.password}
            />
            <button type="button" className="sc-ghost" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              <i className={'bi ' + (showPassword ? 'bi-eye-slash' : 'bi-eye')} aria-hidden="true" />
            </button>
          </div>
          <small>{password ? PASSWORD_HINT + ` Saving signs the ${who} out of every device.` : `Only fill this in to reset the ${who}’s password.`}</small>
          {fieldErrors.password && <em>{fieldErrors.password}</em>}
        </label>
        {!isAuditor && <p className="ma-note">The Student ID ({student.id}) cannot be changed.</p>}
        {error && (
          <div className="cvx-msg err" role="alert">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}

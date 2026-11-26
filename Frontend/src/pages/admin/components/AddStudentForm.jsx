import { useState } from 'react';
import { Avatar, Modal } from '../../../components/ui/Modal.jsx';
import { post } from '../../../services/apiHelper.js';
import { ADMIN_AUDITORS, ADMIN_STUDENTS } from '../../../services/endpoints.js';

// ---- Admin: add a user by hand (Users page → Add user). Styles: .md-* / .as-* in refinements.css
// The admin picks the role (Student / Auditor); `role` presets it from the tab the admin is on.
//   Student: POST /admin/students { name, email, password } -> { student: { uid, id, name, email } }
//            The server issues the Student ID (STU-00001…).
//   Auditor: POST /admin/auditors { name, email, password } -> { auditor: { uid, name, email } }
// Passwords are stored hashed. ----

const PASSWORD_HINT = '8+ characters with an uppercase letter, a lowercase letter, a number and a special character.';

const ROLES = {
  student: { label: 'Student', endpoint: ADMIN_STUDENTS, key: 'student', hint: 'Codes charts. Gets the next Student ID (STU-00001…).' },
  auditor: { label: 'Auditor', endpoint: ADMIN_AUDITORS, key: 'auditor', hint: 'Reviews the submitted charts of the students you assign to them.' },
};

export function AddStudentForm({ role: initialRole = 'student', onClose, onCreated, onAllocate, onAssign }) {
  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [created, setCreated] = useState(null); // the new user
  const r = ROLES[role];
  const who = r.label.toLowerCase();

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError('');
    setFieldErrors({});
    setCreated(null);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    setError('');
    setFieldErrors({});
    const errs = {};
    if (!name.trim()) errs.name = `Enter the ${who}’s name.`;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (!password) errs.password = `Enter a password for the ${who}.`;
    if (Object.keys(errs).length) return setFieldErrors(errs);
    setBusy(true);
    try {
      const res = await post(r.endpoint, { name: name.trim(), email: email.trim(), password });
      setCreated(res[r.key]);
      onCreated && onCreated(res[r.key], role);
    } catch (e) {
      // Field errors from the server (e.g. email already used, weak password).
      const details = (e.data && e.data.details) || [];
      if (details.length) setFieldErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      else setError(e.message || `Could not add the ${who}.`);
    }
    setBusy(false);
  };

  if (created) {
    const isAuditor = role === 'auditor';
    const next = isAuditor ? onAssign : onAllocate;
    return (
      <Modal
        title={`${r.label} added`}
        subtitle={isAuditor ? created.email : created.id}
        icon={<Avatar name={created.name} />}
        onClose={onClose}
        footer={
          <>
            <button type="button" className="sc-ghost" onClick={reset}>
              Add another
            </button>
            <button type="button" className="sc-ghost" onClick={onClose}>
              Done
            </button>
            {next && (
              <button type="button" className="dc-action" onClick={() => next(created)}>
                {isAuditor ? 'Assign students' : 'Allocate charts'}
              </button>
            )}
          </>
        }
      >
        <div className="as-done">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          <div>
            <b>{created.name}</b> can now sign in with <b>{created.email}</b> and the password you set.
            {!isAuditor && (
              <>
                <br />
                Student ID <b className="as-mono">{created.id}</b>
              </>
            )}
          </div>
        </div>
        <p className="ma-note">
          {isAuditor ? 'Next: assign students (per department) so the auditor has charts to review.' : 'Next: allocate department charts so the student has work in My Charts.'}
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Add ${who}`}
      subtitle={role === 'auditor' ? 'Creates an auditor account' : 'Creates a student account with the next Student ID'}
      icon={
        <span className="md-avatar" aria-hidden="true">
          <i className={'bi ' + (role === 'auditor' ? 'bi-clipboard-check' : 'bi-person-plus')} />
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sc-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="add-student-form" className="dc-action" disabled={busy}>
            {busy ? 'Adding…' : `Add ${who}`}
          </button>
        </>
      }
    >
      <form id="add-student-form" className="as-form" onSubmit={submit} noValidate>
        <div className="as-field">
          <span>Role</span>
          <div className="pg-filters us-role" role="radiogroup" aria-label="Role">
            {Object.entries(ROLES).map(([key, x]) => (
              <button key={key} type="button" role="radio" aria-checked={role === key} className={role === key ? 'on' : ''} onClick={() => setRole(key)}>
                {x.label}
              </button>
            ))}
          </div>
          <small>{r.hint}</small>
        </div>
        <label className="as-field">
          <span>Full name</span>
          <input value={name} maxLength={100} autoFocus onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" aria-invalid={!!fieldErrors.name} />
          {fieldErrors.name && <em>{fieldErrors.name}</em>}
        </label>
        <label className="as-field">
          <span>Email</span>
          <input type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} placeholder={`${who}@example.com`} aria-invalid={!!fieldErrors.email} />
          {fieldErrors.email && <em>{fieldErrors.email}</em>}
        </label>
        <label className="as-field">
          <span>Password</span>
          <div className="as-pw">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              autoComplete="new-password"
              maxLength={72}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`Password for the ${who}`}
              aria-invalid={!!fieldErrors.password}
            />
            <button type="button" className="sc-ghost" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              <i className={'bi ' + (showPassword ? 'bi-eye-slash' : 'bi-eye')} aria-hidden="true" />
            </button>
          </div>
          <small>{PASSWORD_HINT}</small>
          {fieldErrors.password && <em>{fieldErrors.password}</em>}
        </label>
        <p className="ma-note">
          {role === 'auditor'
            ? 'Share the email and password with the auditor. They sign in on the same sign-in page.'
            : 'The Student ID (STU-00001…) is assigned automatically. Share the email and password with the student so they can sign in.'}
        </p>
        {error && (
          <div className="cvx-msg err" role="alert">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}

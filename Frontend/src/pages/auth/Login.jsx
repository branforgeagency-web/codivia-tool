import { Tabs, useTabPanel } from '../../components/ui/Tabs.jsx';
import { brand } from '../../config/brand.js';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../../services/apiHelper.js';
import { PUBLIC_DEPARTMENTS } from '../../services/endpoints.js';
import { useSession } from '../../context/SessionContext.jsx';
import * as authApi from '../../services/auth.service.js';

export const CVX_IMG = {
  '01': '/assets/departments/01.webp',
  '02': '/assets/departments/02.webp',
  '03': '/assets/departments/03.webp',
  '04': '/assets/departments/04.webp',
  '05': '/assets/departments/05.webp',
  '06': '/assets/departments/06.webp',
  '07': '/assets/departments/07.webp',
  '08': '/assets/departments/08.webp',
  '09': '/assets/departments/09.webp',
  10: '/assets/departments/10.webp',
  11: '/assets/departments/11.webp',
  12: '/assets/departments/12.webp',
  13: '/assets/departments/13.webp',
  14: '/assets/departments/14.webp',
  15: '/assets/departments/15.webp',
  16: '/assets/departments/16.webp',
  17: '/assets/departments/17.webp',
  18: '/assets/departments/18.webp',
  19: '/assets/departments/19.webp',
  20: '/assets/departments/20.webp',
  21: '/assets/departments/21.webp',
  22: '/assets/departments/22.webp',
};

// app department key -> homepage image number
export const CVX_DEPT_IMG = {
  CARDIO: '01',
  ORTHO: '02',
  RAD: '03',
  ANCIL: '03',
  IVR: '03',
  ED_PRO: '04',
  ED_FAC: '04',
  GENSURG: '05',
  HEMONC: '06',
  OBGYN: '07',
  PEDS: '08',
  GI: '10',
  DERM: '12',
  ENT: '14',
  URO: '15',
  ANES: '16',
  IM: '18',
  EM: '18',
  FP: '18',
  OP: '18',
  PATH: '21',
};

// Icon paths used in the sign-in card
const ICON = {
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  userPlus: 'M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.5 6.5l8.5 6 8.5-6',
  key: 'M7.5 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM11 12h10M18 12v3M21 12v2',
};

export function cvxParams() {
  try {
    const p = new URLSearchParams(window.location.search);
    const d = p.get('dept');
    // Checked against the database list once it loads (GET /departments/public).
    return { signup: p.get('signup') === '1', dept: d && /^[A-Z][A-Z0-9_]{1,19}$/.test(d) ? d : null };
  } catch (err) {
    return { signup: false, dept: null };
  }
}

export function CvxIcon({ d }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <path d={d} />
    </svg>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { startSession } = useSession();
  const accountTabs = useTabPanel();
  const start = useMemo(cvxParams, []);
  const [mode, setMode] = useState(start.signup ? 'register' : 'login'); // login | register
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  // Departments with charts, from the database (public: no sign-in needed).
  const [publicDepts, setPublicDepts] = useState([]);
  useEffect(() => {
    get(PUBLIC_DEPARTMENTS, { auth: false })
      .then((r) => setPublicDepts(r.results || []))
      .catch(() => setPublicDepts([]));
  }, []);
  const deptRow = start.dept ? publicDepts.find((d) => d.key === start.dept) : null;
  const dept = deptRow ? deptRow.key : null;
  const deptName = deptRow ? deptRow.name : '';
  const deptImg = dept && CVX_DEPT_IMG[dept] ? CVX_IMG[CVX_DEPT_IMG[dept]] : null;
  const liveDepts = publicDepts.length || '';

  // API errors carry { status, message, data.details: [{ field, message }] }.
  const nice = (x) => {
    if (!x) return 'Something went wrong. Please try again.';
    if (x.status === undefined) return 'No connection. Check your internet and try again.';
    if (x.status === 429) return 'Too many attempts. Please wait a moment and try again.';
    if (x.status === 409) return 'An account with this email already exists. Try signing in.';
    const detail = x.data && Array.isArray(x.data.details) && x.data.details[0];
    if (detail && detail.message) return detail.message;
    return x.message || 'Something went wrong. Please try again.';
  };

  const switchMode = (m) => {
    setMode(m);
    setErr('');
    setNote('');
    try {
      const p = new URLSearchParams(window.location.search);
      if (m === 'register') p.set('signup', '1');
      else p.delete('signup');
      const q = p.toString();
      navigate(window.location.pathname + (q ? '?' + q : ''), { replace: true });
    } catch (x) {}
  };

  const submit = async (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();
    setErr('');
    setNote('');
    if (mode === 'register' && !name.trim()) {
      setErr('Please enter your full name.');
      return;
    }
    if (!email || !pw) {
      setErr('Please enter your email and password.');
      return;
    }
    if (mode === 'register' && pw.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        // Create the account, then send the student to Sign in (email kept, password cleared).
        const { user } = await authApi.register(name.trim(), email.trim(), pw);
        switchMode('login');
        setPw('');
        setShowPw(false);
        setNote(
          'Account created. Your Student ID is ' +
            user.studentId +
            '. Sign in with your new password to continue.',
        );
        setBusy(false);
        return;
      }
      const { user } = await authApi.login(email.trim(), pw);
      await startSession(user);
    } catch (x) {
      setErr(nice(x));
      setBusy(false);
    }
  };

  // No self-service reset in the API yet: an administrator sets a new password.
  const forgot = () => {
    setErr('');
    setNote('To reset your password, please contact your administrator.');
  };

  const reg = mode === 'register';
  // [title, detail, icon path]
  const perks = [
    [
      (liveDepts ? liveDepts + ' d' : 'D') + 'epartments with real charts',
      'Cardiology to pathology, outpatient to inpatient.',
      'M3 21h18M5 21V8l7-5 7 5v13M10 21v-5h4v5M12 7v5M9.5 9.5h5',
    ],
    [
      '171,568 live codes built in',
      'ICD-10-CM, CPT®, HCPCS and ICD-10-PCS, searchable while you code.',
      'm8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
    ],
    [
      'Every chart scored with a reason',
      'See what you missed and why, in plain language.',
      'M21 12a9 9 0 1 1-9-9M17 12a5 5 0 1 1-5-5M12 12l7-7M16 5h3v3',
    ],
    [
      'Certificate at 200 charts',
      'Your accuracy record and resume are built as you go.',
      'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.2 13.9 7 22l5-3 5 3-1.2-8.1',
    ],
  ];
  const mosaic = ['01', '09', '11', '02', '06', '13'];
  return (
    <div className="cvx-auth">
      {/* ---------- left: brand + value ---------- */}
      <aside className="cvx-side">
        <a className="cvx-logo" href="/" aria-label="CODIVIA home">
          <img src={brand.logoWhite} alt="CODIVIA" />
        </a>
        <div className="cvx-pitch">
          <span className="cvx-eyebrow">
            <i />
            {reg ? 'Sign up' : 'Welcome back'}
          </span>
          <h1>
            Code real charts.
            <br />
            Validate every claim.
            <br />
            <em>Get hired.</em>
          </h1>
          <p>
            The medical-coding software that works like the job: SOAP notes, live claims, real code
            sets and instant feedback.
          </p>
        </div>
        {deptImg ? (
          <div className="cvx-dept">
            <img src={deptImg} alt="" />
            <div className="cvx-dept-tx">
              <small>{reg ? 'You picked' : 'Continue with'}</small>
              <b>{deptName}</b>
            </div>
          </div>
        ) : (
          <div className="cvx-mosaic" aria-hidden={true}>
            {mosaic.map((k) => (
              <img key={k} src={CVX_IMG[k]} alt="" />
            ))}
          </div>
        )}
        <ul className="cvx-perks">
          {perks.map((p, i) => (
            <li key={i}>
              <span className="cvx-ck">
                <CvxIcon d={p[2]} />
              </span>
              <div>
                <b>{p[0]}</b>
                <span>{p[1]}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="cvx-side-ft">Independent medical-coding simulation platform</div>
      </aside>
      {/* ---------- right: form ---------- */}
      <main className="cvx-main">
        {/* <a className="cvx-back" href="/">
          ← Back to home
        </a> */}
        <form className="cvx-card" onSubmit={submit} noValidate={true}>
          <Tabs id={accountTabs.id} label="Account" className="cvx-tabs" activeClassName="on"
            value={reg ? 'register' : 'login'} onChange={switchMode}
            items={[{ value: 'login', label: 'Sign in' }, { value: 'register', label: 'Sign up' }]} />
          <div {...accountTabs.panelProps}>
          <div className="cvx-card-ico" aria-hidden={true}>
            <CvxIcon d={reg ? ICON.userPlus : ICON.lock} />
          </div>
          <h2>{reg ? 'Create your free account' : 'Sign in to your workspace'}</h2>
          <p className="cvx-sub">
            {reg
              ? 'Takes under a minute. You get your Student ID instantly.'
              : 'Pick up exactly where you left off.'}
          </p>
          {reg && dept && (
            <div className="cvx-chip">
              <span className="cvx-dot" />
              {'Department: '}
              <b>{deptName}</b>
            </div>
          )}
          {reg && (
            <label className="cvx-f">
              <span>Full name</span>
              <div className="cvx-in">
                <CvxIcon d={ICON.user} />
                <input
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  placeholder="e.g. Jordan Miller"
                  autoComplete="name"
                />
              </div>
            </label>
          )}
          <label className="cvx-f">
            <span>Email</span>
            <div className="cvx-in">
              <CvxIcon d={ICON.mail} />
              <input
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </label>
          <label className="cvx-f">
            <span>
              Password
              {!reg && (
                <button type="button" className="cvx-link sm" onClick={forgot}>
                  Forgot password?
                </button>
              )}
            </span>
            <div className="cvx-pw cvx-in">
              <CvxIcon d={ICON.key} />
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(ev) => setPw(ev.target.value)}
                placeholder={reg ? 'At least 8 characters' : '••••••••'}
                autoComplete={reg ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="cvx-eye"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          {err && (
            <div className="cvx-msg err" role="alert">
              {err}
            </div>
          )}
          {note && (
            <div className="cvx-msg ok" role="status">
              {note}
            </div>
          )}
          <button type="submit" className="cvx-btn" disabled={busy}>
            {busy ? 'Please wait…' : reg ? 'Create account' : 'Sign in'}
            {!busy && <CvxIcon d="M5 12h14M13 6l6 6-6 6" />}
          </button>
          <div className="cvx-switch">
            {reg ? 'Already have an account? ' : 'New to CODIVIA? '}
            <button
              type="button"
              className="cvx-link"
              onClick={() => switchMode(reg ? 'login' : 'register')}
            >
              {reg ? 'Sign in' : 'Sign up'}
            </button>
          </div>
          <div className="cvx-secure">
            <CvxIcon d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6z" />
            Secured sign-in
          </div>
        </div>
        </form>
        <p className="cvx-roles">Admins and auditors sign in here too.</p>
      </main>
    </div>
  );
}

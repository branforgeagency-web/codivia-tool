import { Tabs, useTabPanel } from '../../components/ui/Tabs.jsx';
import { brand } from '../../config/brand.js';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEPTS } from '../../config/constants.js';
import { cvxGuestSession } from '../../services/session.js';
import { activeDeptKeys } from '../../utils/allocation.js';

// ---------------- LOGIN ----------------
// CODIVIA-BUILD-APP-1102A — split sign-in / Start free screen (matches the black + orange homepage).
//   /app.html                    -> Sign in
//   /app.html?signup=1           -> Start free (create account)
//   /app.html?signup=1&dept=KEY  -> Start free, with that department shown (KEY = DEPTS key, e.g. CARDIO)
// Auth calls are unchanged: window.CV_FB.register / login / resetPassword.
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

export function cvxParams() {
  try {
    const p = new URLSearchParams(window.location.search);
    const d = p.get('dept');
    return { signup: p.get('signup') === '1', dept: d && DEPTS[d] ? d : null };
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

export function Login({ onLogin }) {
  const navigate = useNavigate();
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
  const dept = start.dept;
  const deptName = dept ? DEPTS[dept].name : '';
  const deptImg = dept && CVX_DEPT_IMG[dept] ? CVX_IMG[CVX_DEPT_IMG[dept]] : null;
  const liveDepts = useMemo(() => {
    try {
      return activeDeptKeys().length;
    } catch (x) {
      return 22;
    }
  }, []);

  const nice = (code) => {
    if (!code) return 'Something went wrong. Please try again.';
    if (
      code.includes('invalid-credential') ||
      code.includes('wrong-password') ||
      code.includes('user-not-found')
    )
      return 'Incorrect email or password.';
    if (code.includes('email-already-in-use'))
      return 'An account with this email already exists. Try signing in.';
    if (code.includes('weak-password')) return 'Password should be at least 6 characters.';
    if (code.includes('invalid-email')) return 'Please enter a valid email address.';
    if (code.includes('too-many-requests'))
      return 'Too many attempts. Please wait a moment and try again.';
    if (code.includes('network')) return 'No connection. Check your internet and try again.';
    return 'Error: ' + code;
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
    if (mode === 'register' && pw.length < 6) {
      setErr('Password should be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        const { studentId } = await window.CV_FB.register(email.trim(), pw, name.trim());
        setNote('Account created. Your Student ID is ' + studentId + '. Signing you in…');
      } else {
        await window.CV_FB.login(email.trim(), pw);
      }
    } catch (x) {
      setErr(nice((x && x.code) || (x && x.message) || ''));
      setBusy(false);
    }
  };

  const forgot = async () => {
    setErr('');
    setNote('');
    if (!email) {
      setErr('Enter your email above first, then tap “Forgot password”.');
      return;
    }
    try {
      await window.CV_FB.resetPassword(email.trim());
      setNote('Password reset email sent to ' + email.trim() + '.');
    } catch (x) {
      setErr(nice((x && x.code) || ''));
    }
  };

  const reg = mode === 'register';
  const CHECK = 'M20 6 9 17l-5-5';
  const perks = [
    [
      liveDepts + ' departments with real charts',
      'Cardiology to pathology, outpatient to inpatient.',
    ],
    [
      '171,568 live codes built in',
      'ICD-10-CM, CPT®, HCPCS and ICD-10-PCS, searchable while you code.',
    ],
    ['Every chart scored with a reason', 'See what you missed and why, in plain language.'],
    ['Certificate at 200 charts', 'Your accuracy record and resume are built as you go.'],
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
            {reg ? 'Start free' : 'Welcome back'}
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
                <CvxIcon d={CHECK} />
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
        <a className="cvx-back" href="/">
          ← Back to home
        </a>
        <form className="cvx-card" onSubmit={submit} noValidate={true}>
          <Tabs id={accountTabs.id} label="Account" className="cvx-tabs" activeClassName="on"
            value={reg ? 'register' : 'login'} onChange={switchMode}
            items={[{ value: 'login', label: 'Sign in' }, { value: 'register', label: 'Start free' }]} />
          <div {...accountTabs.panelProps}>
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
              <input
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                placeholder="e.g. Jordan Miller"
                autoComplete="name"
              />
            </label>
          )}
          <label className="cvx-f">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
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
            <div className="cvx-pw">
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(ev) => setPw(ev.target.value)}
                placeholder={reg ? 'At least 6 characters' : '••••••••'}
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
              {reg ? 'Sign in' : 'Start free'}
            </button>
          </div>
          <button
            type="button"
            className="cvx-guest"
            onClick={() => {
              window.CVX_WANT_LOGIN = false;
              onLogin(cvxGuestSession());
            }}
          >
            Continue without signing in
          </button>
          <div className="cvx-secure">
            <CvxIcon d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6z" />
            Secured with Firebase Authentication
          </div>
        </div>
        </form>
        <p className="cvx-roles">Admins and auditors sign in here too.</p>
      </main>
    </div>
  );
}

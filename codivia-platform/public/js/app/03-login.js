/* CODIVIA platform — sign-in / Start free screen + guest mode */
// ---------------- LOGIN ----------------
// CODIVIA-BUILD-APP-1102A — split sign-in / Start free screen (matches the black + orange homepage).
//   /app.html                    -> Sign in
//   /app.html?signup=1           -> Start free (create account)
//   /app.html?signup=1&dept=KEY  -> Start free, with that department shown (KEY = DEPTS key, e.g. CARDIO)
// Auth calls are unchanged: window.CV_FB.register / login / resetPassword.
const CVX_IMG = {
  "01": "assets/departments/01.webp",
  "02": "assets/departments/02.webp",
  "03": "assets/departments/03.webp",
  "04": "assets/departments/04.webp",
  "05": "assets/departments/05.webp",
  "06": "assets/departments/06.webp",
  "07": "assets/departments/07.webp",
  "08": "assets/departments/08.webp",
  "09": "assets/departments/09.webp",
  "10": "assets/departments/10.webp",
  "11": "assets/departments/11.webp",
  "12": "assets/departments/12.webp",
  "13": "assets/departments/13.webp",
  "14": "assets/departments/14.webp",
  "15": "assets/departments/15.webp",
  "16": "assets/departments/16.webp",
  "17": "assets/departments/17.webp",
  "18": "assets/departments/18.webp",
  "19": "assets/departments/19.webp",
  "20": "assets/departments/20.webp",
  "21": "assets/departments/21.webp",
  "22": "assets/departments/22.webp"
};
// app department key -> homepage image number
const CVX_DEPT_IMG = {CARDIO:'01',ORTHO:'02',RAD:'03',ANCIL:'03',IVR:'03',ED_PRO:'04',ED_FAC:'04',GENSURG:'05',HEMONC:'06',
  OBGYN:'07',PEDS:'08',GI:'10',DERM:'12',ENT:'14',URO:'15',ANES:'16',IM:'18',EM:'18',FP:'18',OP:'18',PATH:'21'};

// Guest access (2 Nov): open the workspace straight away, no login. 5 charts in every live department.
// Guest progress is kept in this browser only. Real accounts (login) still save to Firebase.
function cvxGuestSession(){
  const depts = {};
  try{ activeDeptKeys().forEach(k=>{ depts[k] = 5; }); }catch(x){}
  let res = {};
  try{ res = JSON.parse(localStorage.getItem('cvx-guest-results') || '{}') || {}; }catch(x){}
  return { role:'student', user:{ uid:null, guest:true, id:'GUEST', name:'Guest coder', email:'', depts, initialResults:res } };
}
function cvxWantsLogin(){
  if(window.CVX_WANT_LOGIN) return true;
  try{ return new URLSearchParams(window.location.search).get('login')==='1'; }catch(x){ return false; }
}

function cvxParams(){
  try{
    const p = new URLSearchParams(window.location.search);
    const d = p.get('dept');
    return { signup: p.get('signup')==='1', dept: (d && DEPTS[d]) ? d : null };
  }catch(err){ return { signup:false, dept:null }; }
}

function CvxIcon({ d }){
  return e('svg',{viewBox:'0 0 24 24', width:18, height:18, fill:'none', stroke:'currentColor', strokeWidth:2.2,
    strokeLinecap:'round', strokeLinejoin:'round', 'aria-hidden':true}, e('path',{d}));
}

function Login({ onLogin }){
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
  const liveDepts = useMemo(()=>{ try{ return activeDeptKeys().length; }catch(x){ return 22; } }, []);

  const nice = (code)=>{
    if(!code) return 'Something went wrong. Please try again.';
    if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found')) return 'Incorrect email or password.';
    if(code.includes('email-already-in-use')) return 'An account with this email already exists. Try signing in.';
    if(code.includes('weak-password')) return 'Password should be at least 6 characters.';
    if(code.includes('invalid-email')) return 'Please enter a valid email address.';
    if(code.includes('too-many-requests')) return 'Too many attempts. Please wait a moment and try again.';
    if(code.includes('network')) return 'No connection. Check your internet and try again.';
    return 'Error: ' + code;
  };

  const switchMode = (m)=>{
    setMode(m); setErr(''); setNote('');
    try{
      const p = new URLSearchParams(window.location.search);
      if(m==='register') p.set('signup','1'); else p.delete('signup');
      const q = p.toString();
      window.history.replaceState(null,'', window.location.pathname + (q ? '?'+q : ''));
    }catch(x){}
  };

  const submit = async (ev)=>{
    if(ev && ev.preventDefault) ev.preventDefault();
    setErr(''); setNote('');
    if(mode==='register' && !name.trim()){ setErr('Please enter your full name.'); return; }
    if(!email || !pw){ setErr('Please enter your email and password.'); return; }
    if(mode==='register' && pw.length < 6){ setErr('Password should be at least 6 characters.'); return; }
    setBusy(true);
    try{
      if(mode==='register'){
        const { studentId } = await window.CV_FB.register(email.trim(), pw, name.trim());
        setNote('Account created. Your Student ID is '+studentId+'. Signing you in…');
      } else {
        await window.CV_FB.login(email.trim(), pw);
      }
    }catch(x){
      setErr(nice((x && x.code) || (x && x.message) || ''));
      setBusy(false);
    }
  };

  const forgot = async ()=>{
    setErr(''); setNote('');
    if(!email){ setErr('Enter your email above first, then tap “Forgot password”.'); return; }
    try{ await window.CV_FB.resetPassword(email.trim()); setNote('Password reset email sent to '+email.trim()+'.'); }
    catch(x){ setErr(nice((x && x.code) || '')); }
  };

  const reg = mode==='register';
  const CHECK = 'M20 6 9 17l-5-5';
  const perks = [
    [liveDepts+' departments with real charts', 'Cardiology to pathology, outpatient to inpatient.'],
    ['171,568 live codes built in', 'ICD-10-CM, CPT®, HCPCS and ICD-10-PCS, searchable while you code.'],
    ['Every chart scored with a reason', 'See what you missed and why, in plain language.'],
    ['Certificate at 200 charts', 'Your accuracy record and resume are built as you go.'],
  ];
  const mosaic = ['01','09','11','02','06','13'];

  return e('div',{className:'cvx-auth'},
    // ---------- left: brand + value ----------
    e('aside',{className:'cvx-side'},
      e('a',{className:'cvx-logo', href:'/', 'aria-label':'CODIVIA home'},
        e('img',{src:window.CV_LOGO_WHITE || window.CV_LOGO, alt:'CODIVIA'})),
      e('div',{className:'cvx-pitch'},
        e('span',{className:'cvx-eyebrow'}, e('i'), reg ? 'Start free' : 'Welcome back'),
        e('h1',null, 'Code real charts.', e('br'), 'Validate every claim.', e('br'), e('em',null,'Get hired.')),
        e('p',null, 'The medical-coding software that works like the job: SOAP notes, live claims, real code sets and instant feedback.')
      ),
      deptImg
        ? e('div',{className:'cvx-dept'},
            e('img',{src:deptImg, alt:''}),
            e('div',{className:'cvx-dept-tx'},
              e('small',null, reg ? 'You picked' : 'Continue with'),
              e('b',null, deptName)))
        : e('div',{className:'cvx-mosaic','aria-hidden':true}, mosaic.map(k=> e('img',{key:k, src:CVX_IMG[k], alt:''}))),
      e('ul',{className:'cvx-perks'}, perks.map((p,i)=> e('li',{key:i},
        e('span',{className:'cvx-ck'}, e(CvxIcon,{d:CHECK})),
        e('div',null, e('b',null,p[0]), e('span',null,p[1]))))),
      e('div',{className:'cvx-side-ft'}, 'Independent medical-coding simulation platform')
    ),
    // ---------- right: form ----------
    e('main',{className:'cvx-main'},
      e('a',{className:'cvx-back', href:'/'}, '← Back to home'),
      e('form',{className:'cvx-card', onSubmit:submit, noValidate:true},
        e('div',{className:'cvx-tabs', role:'tablist', 'aria-label':'Account'},
          e('button',{type:'button', role:'tab', 'aria-selected':!reg, className:!reg?'on':'', onClick:()=>switchMode('login')}, 'Sign in'),
          e('button',{type:'button', role:'tab', 'aria-selected':reg, className:reg?'on':'', onClick:()=>switchMode('register')}, 'Start free')),
        e('h2',null, reg ? 'Create your free account' : 'Sign in to your workspace'),
        e('p',{className:'cvx-sub'}, reg ? 'Takes under a minute. You get your Student ID instantly.' : 'Pick up exactly where you left off.'),
        reg && dept && e('div',{className:'cvx-chip'}, e('span',{className:'cvx-dot'}), 'Department: ', e('b',null, deptName)),
        reg && e('label',{className:'cvx-f'},
          e('span',null,'Full name'),
          e('input',{value:name, onChange:ev=>setName(ev.target.value), placeholder:'e.g. Jordan Miller', autoComplete:'name'})),
        e('label',{className:'cvx-f'},
          e('span',null,'Email'),
          e('input',{type:'email', value:email, onChange:ev=>setEmail(ev.target.value), placeholder:'you@example.com', autoComplete:'email'})),
        e('label',{className:'cvx-f'},
          e('span',null,'Password', !reg && e('button',{type:'button', className:'cvx-link sm', onClick:forgot}, 'Forgot password?')),
          e('div',{className:'cvx-pw'},
            e('input',{type:showPw?'text':'password', value:pw, onChange:ev=>setPw(ev.target.value),
              placeholder: reg ? 'At least 6 characters' : '••••••••', autoComplete: reg ? 'new-password' : 'current-password'}),
            e('button',{type:'button', className:'cvx-eye', onClick:()=>setShowPw(!showPw), 'aria-label': showPw ? 'Hide password' : 'Show password'},
              showPw ? 'Hide' : 'Show'))),
        err && e('div',{className:'cvx-msg err', role:'alert'}, err),
        note && e('div',{className:'cvx-msg ok', role:'status'}, note),
        e('button',{type:'submit', className:'cvx-btn', disabled:busy},
          busy ? 'Please wait…' : (reg ? 'Create account' : 'Sign in'),
          !busy && e(CvxIcon,{d:'M5 12h14M13 6l6 6-6 6'})),
        e('div',{className:'cvx-switch'},
          reg ? 'Already have an account? ' : 'New to CODIVIA? ',
          e('button',{type:'button', className:'cvx-link', onClick:()=>switchMode(reg?'login':'register')}, reg ? 'Sign in' : 'Start free')),
        e('button',{type:'button', className:'cvx-guest', onClick:()=>{ window.CVX_WANT_LOGIN=false; onLogin(cvxGuestSession()); }},
          'Continue without signing in'),
        e('div',{className:'cvx-secure'}, e(CvxIcon,{d:'M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6z'}), 'Secured with Firebase Authentication')
      ),
      e('p',{className:'cvx-roles'}, 'Admins and auditors sign in here too.')
    )
  );
}

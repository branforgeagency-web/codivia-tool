/* CODIVIA platform — student workspace shell + results saving */
// ---------------- STUDENT APP ----------------
const CERT_THRESHOLD = 200; // charts to unlock certificate

function StudentApp({ session, onLogout, codeDB, dbStatus }){
  const stu = session.user;
  // A popup window opened with ?view=findcode lands directly on Code Search.
  const [nav, setNav] = useState(()=>{
    try{
      const p = new URLSearchParams(window.location.search);
      const v = p.get('view');
      if(v==='findcode') return 'findcode';
      // A link like ?dept=CARDIO from the marketing homepage lands the student
      // directly on that department's chart queue — but only when they are
      // allocated that department and it actually has charts behind it.
      const d = p.get('dept');
      if(d && DEPTS[d] && stu.depts && stu.depts[d]!=null && deptHasCharts(d)) return 'charts';
    }catch(err){}
    return 'dashboard';
  }); // dashboard | charts | progress | certificate | resume | findcode
  const [dept, setDept] = useState(()=>{
    try{
      const d = new URLSearchParams(window.location.search).get('dept');
      if(d && DEPTS[d] && stu.depts && stu.depts[d]!=null && deptHasCharts(d)) return d;
    }catch(err){}
    return null;
  });       // selected dept within "charts" (may be pre-set from ?dept= deep link)
  const [activeChart, setActiveChart] = useState(null);
  const [results, setResults] = useState(stu.initialResults || {}); // chartId -> {accuracy, dept, ...}
  const [demoCert, setDemoCert] = useState(false); // preview: simulate a certified department

  // Saving is idempotent: re-submitting the same chart overwrites its entry.
  const [saveState, setSaveState] = useState('');  // '' | 'saving' | 'saved' | 'error'
  const resultsRef = useRef(null);
  if(resultsRef.current === null) resultsRef.current = (stu.initialResults || {});

  const recordResult = (chartId, res, dk)=>{
    // Only the fields needed for progress/scoring are persisted. The full
    // correct/missed/wrong arrays carry every rationale string and would push
    // the progress document past the Firestore 1 MiB limit once a student
    // approaches the 200-chart certificate threshold in more than one dept.
    const slim = {
      accuracy: (typeof res.accuracy === 'number') ? res.accuracy : 0,
      total: (typeof res.total === 'number') ? res.total : 0,
      correct: Array.isArray(res.correct) ? res.correct.length : 0,
      dept: dk,
      at: Date.now()
    };
    if(res.drgOk === true || res.drgOk === false) slim.drgOk = res.drgOk;
    // Store CODES ONLY for missed / wrong answers so admin can see where a
    // student is going wrong. Rationale text is deliberately excluded — it is
    // what would blow the Firestore 1 MiB document limit at scale.
    // missed[] entries carry .raw (dotted code) and .code (normalised).
    // wrong[]  entries carry .code (what the student submitted) and, when the
    // grader could pair it, .correctedTo.code (the audited code).
    if(Array.isArray(res.missed) && res.missed.length){
      slim.miss = res.missed.map(k=> String((k && (k.raw || k.code)) || ''))
                            .filter(Boolean).slice(0,12);
    }
    if(Array.isArray(res.wrong) && res.wrong.length){
      slim.wrong = res.wrong.map(w=>[
        String((w && w.code) || ''),
        String((w && w.correctedTo && w.correctedTo.code) || '')
      ]).filter(x=>x[0]).slice(0,12);
    }

    const next = {...resultsRef.current, [chartId]: slim};
    resultsRef.current = next;
    setResults(next);

    if(stu.guest){ try{ localStorage.setItem('cvx-guest-results', JSON.stringify(next)); }catch(x){} }
    if(stu.uid && window.CV_FB){
      setSaveState('saving');
      window.CV_FB.saveProgress(stu.uid, next)
        .then(()=> setSaveState('saved'))
        .catch(e=>{ console.error('save progress', e); setSaveState('error'); });
    }
  };

  // aggregate stats per department
  const stats = useMemo(()=>{
    const perDept = {};
    const allocEntries = Object.entries(stu.depts).filter(([dk])=>deptHasCharts(dk));
    const firstDept = allocEntries.length ? allocEntries[0][0] : undefined;
    allocEntries.forEach(([dk,alloc])=>{
      const worked = Object.entries(results).filter(([id,r])=>r.dept===dk);
      const accs = worked.map(([,r])=>r.accuracy);
      let workedCount = worked.length;
      let avg = accs.length ? Math.round(accs.reduce((a,b)=>a+b,0)/accs.length) : 0;
      // Preview mode: simulate the first department as fully certified so the
      // certificate can be seen generating without working 200 real charts.
      if(demoCert && dk===firstDept){
        workedCount = Math.max(workedCount, CERT_THRESHOLD + 10);
        avg = avg || 94;
      }
      perDept[dk] = {
        alloc, worked: workedCount,
        avg,
        certified: workedCount >= CERT_THRESHOLD,
      };
    });
    const totalWorked = Object.keys(results).length;
    const allAccs = Object.values(results).map(r=>r.accuracy);
    const overallAvg = allAccs.length ? Math.round(allAccs.reduce((a,b)=>a+b,0)/allAccs.length) : 0;
    const anyCertified = Object.values(perDept).some(d=>d.certified);
    return { perDept, totalWorked, overallAvg, anyCertified };
  },[results, stu.depts, demoCert]);

  // CODIVIA Score is earned, not granted. A student who has coded nothing has no
  // score yet — showing a floor of 550 made an untouched account look accomplished.
  const hasScore = stats.totalWorked > 0;
  const codScore = hasScore
    ? Math.min(850, 300 + stats.totalWorked*2 + Math.round(stats.overallAvg*2))
    : null;

  // full-screen coder overrides layout
  if(activeChart){
    return e(React.Fragment,null,
      e(TopBar,{ session, onLogout,
        extra: e('span',{className:'who', style:{color:'#9fb3c7'}}, 'Coding · ', e('b',null, DEPTS[dept].name),
          saveState==='saving' && e('span',{style:{marginLeft:10,fontSize:11,fontWeight:800,color:'#9fb3c7'}},'\u00b7 saving\u2026'),
          saveState==='saved'  && e('span',{style:{marginLeft:10,fontSize:11,fontWeight:800,color:'#39D0B4'}},'\u00b7 saved \u2713'),
          saveState==='error'  && e('span',{style:{marginLeft:10,fontSize:11,fontWeight:800,color:'#FF6B6B'}},'\u00b7 NOT SAVED \u2014 check connection')) }),
      e(Coder,{ chart:activeChart, codeDB, dbStatus, saveState,
        onClose:()=>setActiveChart(null),
        onSubmit:(res)=>{ recordResult(activeChart.id, res, dept); }
      })
    );
  }

  const tiles = [
    { id:'dashboard', ic:'🏠', lbl:'Dashboard', accent:'#F26722', accent2:'#0B3B36' },
    { id:'charts', ic:'📋', lbl:'My Charts', count: stats.totalWorked, accent:'#3B82F6', accent2:'#1E3A8A' },
    { id:'progress', ic:'📊', lbl:'My Progress', accent:'#8B5CF6', accent2:'#5B21B6' },
    { id:'findcode', ic:'🔍', lbl:'CODIVIA Code Search', accent:'#0891B2', accent2:'#0E4A5C' },
    { id:'guide', ic:'📘', lbl:'Coding Guidelines', accent:'#6366F1', accent2:'#312E81' },
    { id:'drugref', ic:'💊', lbl:'Drug Reference', accent:'#E5A82E', accent2:'#7A5A12' },
    { id:'certificate', ic:'🎓', lbl:'Certificate', locked: !stats.anyCertified, accent:'#E5A82E', accent2:'#92600A' },
    { id:'mycerts', ic:'📎', lbl:'My Certificates', accent:'#0EA5A0', accent2:'#0B4A47' },
    { id:'resume', ic:'📄', lbl:'Resume Builder', accent:'#EC4899', accent2:'#9D174D' },
  ];

  const go = (id)=>{ setNav(id); setDept(null); };

  return e(React.Fragment,null,
    e(TopBar,{ session, onLogout,
      extra: e('span',{className:'who'}, 'CODIVIA Score ',
        e('b',null, hasScore ? codScore : '\u2014')) }),
    e('div',{className:'shell'},
      // SIDEBAR
      e('div',{className:'sidebar'},
        tiles.map(t=>
          e('button',{ key:t.id,
            className:'side-tile'+(nav===t.id?' active':'')+(t.locked?' side-lock':''),
            style:{ '--tile-accent':t.accent, '--tile-accent2':t.accent2 },
            onClick:()=> t.locked ? null : go(t.id) },
            e('span',{className:'ic'}, t.locked?'🔒':t.ic),
            e('span',{className:'lbl'}, t.lbl),
            t.count>0 && e('span',{className:'badge-count'}, t.count)
          )
        ),
        e('div',{className:'side-score'},
          e('div',{className:'n', style: hasScore?null:{fontSize:26,color:'var(--muted)'}},
            hasScore ? codScore : 'Not yet'),
          e('div',{className:'l'}, hasScore ? 'CODIVIA Score' : 'Score starts after your first chart')
        ),
        e('div',{className:'side-foot'}, stu.id, e('br'), 'Certificate unlocks at '+CERT_THRESHOLD+' charts',
          e('button',{
            onClick:()=>{ setDemoCert(v=>!v); go('certificate'); },
            style:{marginTop:10,width:'100%',fontSize:11,fontWeight:700,padding:'7px 8px',borderRadius:6,cursor:'pointer',
              border:'1px solid '+(demoCert?'#F26722':'#e3bd5c'),
              background:demoCert?'#FDEBD9':'#fff2cf',
              color:demoCert?'#C4501A':'#9a6b12'}},
            demoCert ? '✓ Preview ON — click to turn off' : '👁 Preview certificate')
        )
      ),
      // MAIN
      e('div',{className:'main'},
        nav==='dashboard' && e(Dashboard,{ stu, stats, onGoDept:(dk)=>{ setNav('charts'); setDept(dk); }, onNav:go }),
        nav==='charts' && (dept
          ? e(DeptQueue,{ dept, stu, results, onBack:()=>setDept(null), onOpen:setActiveChart })
          : e(DeptSelect,{ stu, stats, onSelect:setDept })),
        nav==='progress' && e(ProgressView,{ stu, stats }),
        nav==='findcode' && e(FindACode,{ codeDB, dbStatus }),
        nav==='guide' && e(CodingGuide,null),
        nav==='drugref' && e(DrugReference,{ codeDB, dbStatus }),
        nav==='certificate' && e(CertificateView,{ stu, stats }),
        nav==='mycerts' && e(MyCertificates,{ stu }),
        nav==='resume' && e(ResumeView,{ stu, stats }),
      )
    )
  );
}

/* CODIVIA platform — admin: overview, departments, charts, performance */
// ---------------- ADMIN (allocate charts) ----------------
function AdminApp({ session, onLogout }){
  const [nav, setNav] = useState('overview'); // overview | departments | students | charts
  const [browseChart, setBrowseChart] = useState(null); // chart being previewed
  // students loaded from Firestore (real registered users)
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [modal, setModal] = useState(null); // { type:'allocate'|'addStudent', ... }
  const [perfId, setPerfId] = useState(null); // studentId whose performance panel is open

  const refreshStudents = React.useCallback(()=>{
    if(!window.CV_FB){ setLoadingStudents(false); return; }
    setLoadingStudents(true);
    window.CV_FB.listStudents()
      .then(list=>{ setStudents(list.map(s=>({...s, depts:{...s.depts}, results:s.results||{}, progressError:s.progressError||null}))); setLoadingStudents(false); })
      .catch(e=>{ console.error('listStudents', e); setStudents([]); setLoadingStudents(false); });
  },[]);
  useEffect(()=>{ refreshStudents(); },[refreshStudents]);

  // Persist a student's COMPLETE allocation map in one write.
  // Writing per-department raced: each call captured a stale depts snapshot and
  // fired its own Firestore write, so the last one to land overwrote the rest.
  // Bulk allocate: write ranges for many students, in batches, with progress.
  // Only students in the plan (those with no current allocation) are written.
  const bulkAllocate = async (plan, onProgress)=>{
    if(!window.CV_FB){ return; }
    const BATCH = 25;
    let done = 0;
    for(let i=0; i<plan.length; i+=BATCH){
      const slice = plan.slice(i, i+BATCH);
      await Promise.all(slice.map(row=>{
        const s = row.student;
        const depts = {};
        Object.entries(row.depts).forEach(([dk,r])=>{ if(r && r.start>=1 && r.end>=r.start) depts[dk]={start:r.start,end:r.end}; });
        if(!s.uid) return Promise.resolve();
        return window.CV_FB.setAllocation(s.uid, depts).catch(e=>console.error('bulk setAllocation', s.id, e));
      }));
      done += slice.length;
      if(onProgress) onProgress(done);
    }
    // reflect locally without a full reload
    setStudents(list=> list.map(s=>{
      const row = plan.find(r=>r.student.id===s.id);
      if(!row) return s;
      return {...s, depts:{...row.depts}};
    }));
  };

  const allocateMany = (studentId, deptAlloc)=>{
    setStudents(list=> list.map(s=>{
      if(s.id!==studentId) return s;
      // deptAlloc entries are either {start,end} range objects or legacy numbers.
      const depts={};
      Object.entries(deptAlloc).forEach(([dk,v])=>{
        if(v && typeof v==='object'){
          const st=v.start|0, en=v.end|0;
          if(st>=1 && en>=st) depts[dk]={start:st, end:en};
        } else {
          const n=Number(v)||0; if(n>0) depts[dk]={start:1, end:n};
        }
      });
      if(s.uid && window.CV_FB){
        window.CV_FB.setAllocation(s.uid, depts).catch(e=>console.error('setAllocation', e));
      }
      return {...s, depts};
    }));
    setModal(null);
  };
  // single-department helper (used by the per-department allocator)
  const allocate = (studentId, deptKey, val)=>{
    setStudents(list=> list.map(s=>{
      if(s.id!==studentId) return s;
      const depts={...s.depts};
      // val may be a {start,end} range object or a legacy number.
      if(val && typeof val==='object' && val.start>=1 && val.end>=val.start){
        depts[deptKey]={start:val.start|0, end:val.end|0};
      } else {
        const n=Number(val)||0;
        if(n>0) depts[deptKey]={start:1, end:n}; else delete depts[deptKey];
      }
      if(s.uid && window.CV_FB){
        window.CV_FB.setAllocation(s.uid, depts).catch(e=>console.error('setAllocation', e));
      }
      return {...s, depts};
    }));
    setModal(null);
  };
  // students self-register now; this just refreshes the list from Firestore
  const addStudent = ()=>{ refreshStudents(); setModal(null); };

  // aggregate: charts allocated per department across all students
  const deptAlloc = useMemo(()=>{
    const m={}; activeDeptKeys().forEach(dk=>m[dk]=0);
    students.forEach(s=>Object.entries(s.depts||{}).forEach(([dk,v])=>{
      m[dk]=(m[dk]||0)+allocCount(v,((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length);
    }));
    return m;
  },[students]);

  const totalAllocated = Object.values(deptAlloc).reduce((a,b)=>a+b,0);
  const totalPool = activeDeptKeys().reduce((a,dk)=>a+((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length,0);

  const tiles = [
    { id:'overview', ic:'🏠', lbl:'Overview', accent:'#F26722', accent2:'#0B3B36' },
    { id:'departments', ic:'🗂️', lbl:'Departments', accent:'#3B82F6', accent2:'#1E3A8A' },
    { id:'charts', ic:'📄', lbl:'Browse Charts', accent:'#0EA5A0', accent2:'#0B4A47' },
    { id:'students', ic:'👥', lbl:'Students', count: students.length, accent:'#8B5CF6', accent2:'#5B21B6' },
    { id:'upload', ic:'📤', lbl:'Upload Charts', accent:'#F26722', accent2:'#7A2E14' },
  ];

  return e(React.Fragment,null,
    e(TopBar,{ session, onLogout,
      extra: e('span',{className:'who'}, e('b',null, students.length+' students · '+activeDeptKeys().length+' depts')) }),
    e('div',{className:'shell'},
      e('div',{className:'sidebar'},
        tiles.map(t=>
          e('button',{ key:t.id, className:'side-tile'+(nav===t.id?' active':''), style:{ '--tile-accent':t.accent, '--tile-accent2':t.accent2 }, onClick:()=>setNav(t.id) },
            e('span',{className:'ic'}, t.ic), e('span',{className:'lbl'}, t.lbl),
            t.count>0 && e('span',{className:'badge-count'}, t.count))
        ),
        e('div',{className:'side-sep'}),
        e('button',{className:'side-tile', style:{ '--tile-accent':'#10B981', '--tile-accent2':'#065F46' }, onClick:refreshStudents},
          e('span',{className:'ic'},'🔄'), e('span',{className:'lbl'}, loadingStudents?'Loading…':'Refresh list')),
        e('div',{className:'side-foot'}, 'Admin / TL', e('br'), totalAllocated.toLocaleString()+' of '+totalPool.toLocaleString()+' charts allocated')
      ),
      e('div',{className:'main'},
        nav==='overview' && e(AdminOverview,{ students, deptAlloc, totalAllocated, totalPool }),
        nav==='departments' && e(AdminDepartments,{ students, deptAlloc, onManage:(dk)=>setModal({type:'deptAllocate', dept:dk}) }),
        nav==='charts' && e(AdminCharts,{ onView:(c)=>setBrowseChart(c) }),
        nav==='students' && e(AdminStudents,{ students, onAllocate:(sid)=>setModal({type:'allocate', studentId:sid}), onAdd:refreshStudents, onPerf:(sid)=>setPerfId(sid), onBulk:()=>setModal({type:'bulkAllocate'}) }),
        nav==='upload' && e(AdminUpload,null),
      )
    ),
    modal && e(AdminModal,{ modal, students, allocate, allocateMany, addStudent, bulkAllocate, onClose:()=>setModal(null) }),
    perfId && (function(){
      const st = students.find(s=>s.id===perfId);
      return st ? e(AdminPerformance,{ student:st, onClose:()=>setPerfId(null) }) : null;
    })(),
    browseChart && e(AdminChartView,{ chart:browseChart, onClose:()=>setBrowseChart(null) })
  );
}

function AdminOverview({ students, deptAlloc, totalAllocated, totalPool }){
  return e('div',null,
    e('div',{className:'page-head'}, e('h1',null,'Admin Overview'),
      e('p',null,'All departments, chart pools, and student allocations across CODIVIA.')),
    e('div',{className:'stat-row'},
      e(Stat,{k:'Departments', v:activeDeptKeys().length, s:'coding domains', teal:true}),
      e(Stat,{k:'Total Chart Pool', v:totalPool.toLocaleString(), s:'available to allocate'}),
      e(Stat,{k:'Allocated', v:totalAllocated.toLocaleString(), s:'assigned to students'}),
      e(Stat,{k:'Students', v:students.length, s:'active'}),
    ),
    e('div',{className:'card'},
      e('div',{className:'card-h'}, e('h3',null,'Department Chart Pools')),
      e('table',null,
        e('thead',null,e('tr',null,['Department','Code Sets','Pool','Allocated','Available'].map(h=>e('th',{key:h},h)))),
        e('tbody',null,
          Object.entries(DEPTS).filter(([dk])=>deptHasCharts(dk)).map(([dk,d])=>{
            const alloc=deptAlloc[dk]||0; const avail=d.pool-alloc;
            return e('tr',{key:dk},
              e('td',null, d.icon+' '+d.name),
              e('td',null, e('span',{style:{color:'var(--teal-d)',fontWeight:700,fontSize:12}}, (d.elements||[]).map(x=>ELEMENT_LABELS[x]||x).join(' · '))),
              e('td',null, d.pool),
              e('td',null, e('b',null, alloc)),
              e('td',null, e('span',{style:{color:avail>0?'var(--ok)':'var(--err)'}}, avail))
            );
          })
        )
      )
    )
  );
}

function AdminDepartments({ students, deptAlloc, onManage }){
  const specialty = Object.entries(DEPTS).filter(([dk,d])=>d.group==='specialty' && deptHasCharts(dk));
  const setting = Object.entries(DEPTS).filter(([dk,d])=>d.group==='setting' && deptHasCharts(dk));
  const renderGrid = (list)=> e('div',{className:'dept-grid'},
    list.map(([dk,d])=>{
      const alloc=deptAlloc[dk]||0;
      const studentCount = students.filter(s=>s.depts && s.depts[dk]).length;
      return e('div',{key:dk, className:'dept-card', onClick:()=>onManage(dk)},
        e('div',{className:'ico'}, d.icon),
        e('h3',null, d.name),
        e(ElementTiles,{dept:d, setting:d.group==='setting'}),
        e('div',{className:'alloc'}, e('span',null,'Pool'), e('b',null, ((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length)),
        e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:6}},
          alloc+' allocated · '+studentCount+' student'+(studentCount!==1?'s':''))
      );
    })
  );
  return e('div',null,
    e('div',{className:'page-head'}, e('h1',null,'Departments'),
      e('p',null, (specialty.length+setting.length)+' active coding departments across two groups — specialty tracks and RCM setting domains. Chart pools vary by department.')),
    e('div',{style:{fontSize:12,fontWeight:800,color:'var(--teal-d)',textTransform:'uppercase',letterSpacing:'.5px',margin:'0 0 12px'}},
      '⬤ Specialty Tracks — by body system ('+specialty.length+')'),
    renderGrid(specialty),
    e('div',{style:{fontSize:12,fontWeight:800,color:'var(--terra)',textTransform:'uppercase',letterSpacing:'.5px',margin:'26px 0 12px'}},
      '⬤ Setting / Type Domains — how RCM hires ('+setting.length+')'),
    renderGrid(setting)
  );
}

// ---- Admin: browse & preview the actual charts in each department ----
function AdminCharts({ onView }){
  const [dept, setDept] = useState(null);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(50);

  if(!dept){
    return e('div',null,
      e('div',{className:'page-head'}, e('h1',null,'Browse Charts'),
        e('p',null,'Open any department to review its charts — read the record and check the answer key.')),
      e('div',{className:'dept-grid'},
        Object.entries(DEPTS).filter(([dk])=>deptHasCharts(dk)).map(([dk,d])=>{
          const total=((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length;
          return e('div',{key:dk, className:'dept-card', onClick:()=>{ setDept(dk); setQ(''); setShown(50); }},
            e('div',{className:'ico'}, d.icon),
            e('h3',null, d.name),
            e(ElementTiles,{dept:d, setting:d.group==='setting'}),
            e('div',{className:'alloc'}, e('span',null,'Charts'), e('b',null, total)),
            e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:6}}, 'Click to browse')
          );
        })
      )
    );
  }

  const d = DEPTS[dept];
  const charts = ((window.CHART_DATA&&window.CHART_DATA[dept])||[]);
  const filtered = q.trim()
    ? charts.filter(c=> (c.title+' '+c.id+' '+c.patient.name+' '+(c.answerKey[0]&&c.answerKey[0].code||'')).toLowerCase().includes(q.toLowerCase().trim()))
    : charts;
  const visible = filtered.slice(0, shown);

  return e('div',null,
    e('button',{className:'backbtn', onClick:()=>setDept(null)},'← All departments'),
    e('div',{className:'page-head'}, e('h1',null, d.icon+' '+d.name),
      e('p',null, charts.length+' charts in this department')),
    e('div',{className:'card'},
      e('div',{className:'card-h', style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}},
        e('h3',null,'Charts'),
        e('input',{value:q, placeholder:'Search title, ID, code, patient…', style:{fontSize:12,padding:'6px 10px',border:'1px solid var(--line)',borderRadius:6,minWidth:240},
          onChange:ev=>{ setQ(ev.target.value); setShown(50); }})
      ),
      e('table',null,
        e('thead',null,e('tr',null,['Chart','Patient','Answer Key','Level','Action'].map(h=>e('th',{key:h},h)))),
        e('tbody',null,
          visible.map(c=>{
            const keyStr=c.answerKey.map(a=>a.code).join(', ');
            return e('tr',{key:c.id},
              e('td',null, e('div',{style:{fontWeight:600}}, c.title),
                e('div',{style:{fontSize:11,color:'var(--muted)'}}, c.id,
                  c.handwritten? e('span',{style:{marginLeft:6,fontSize:10,fontWeight:700,color:'#9a6b12',background:'#fff2cf',border:'1px solid #e3bd5c',borderRadius:4,padding:'1px 5px'}},'✎ HANDWRITTEN') : null)),
              e('td',null, c.patient.name, e('div',{style:{fontSize:11,color:'var(--muted)'}}, c.patient.sex+' · '+c.patient.age+'y')),
              e('td',null, e('span',{style:{fontSize:11,fontWeight:700,color:'var(--teal-d)'}}, keyStr)),
              e('td',null, e('span',{className:'badge '+c.difficulty}, c.difficulty)),
              e('td',null, e('button',{className:'btn btn-teal', onClick:()=>onView(c)},'View'))
            );
          })
        )
      ),
      shown < filtered.length
        ? e('div',{style:{textAlign:'center',padding:'14px'}},
            e('button',{className:'btn btn-ghost', onClick:()=>setShown(shown+50)},
              'Show more ('+(filtered.length-shown)+' remaining)'))
        : (filtered.length===0 ? e('div',{style:{textAlign:'center',padding:'14px',color:'var(--muted)',fontSize:13}},'No charts match your search.') : null)
    )
  );
}

function AdminChartView({ chart, onClose }){
  return e('div',{className:'result-overlay', onClick:ev=>{ if(ev.target.className==='result-overlay') onClose(); }},
    e('div',{className:'result-card', style:{maxWidth:820,width:'94%',maxHeight:'88vh'}},
      e('div',{className:'card-h', style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}},
        e('div',null,
          e('h3',null, chart.title),
          e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:2}}, chart.id+' · '+chart.deptName+' · '+chart.patient.name+' ('+chart.patient.sex+' '+chart.patient.age+'y)')),
        e('button',{className:'btn btn-ghost', onClick:onClose},'Close')
      ),
      e('div',{style:{padding:'16px',overflowY:'auto',maxHeight:'72vh'}},
        e('div',{style:{fontSize:12,fontWeight:800,color:'var(--teal-d)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}},'Medical Record'),
        e('pre',{style:{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:13,lineHeight:1.5,background:'#F8FAFA',border:'1px solid var(--line)',borderRadius:8,padding:14,margin:0}}, chart.record),
        e('div',{style:{fontSize:12,fontWeight:800,color:'var(--teal-d)',textTransform:'uppercase',letterSpacing:'.5px',margin:'18px 0 8px'}},'Answer Key'),
        e('table',null,
          e('thead',null,e('tr',null,['Code','Description','Type'].map(h=>e('th',{key:h},h)))),
          e('tbody',null,
            chart.answerKey.map((a,i)=>e('tr',{key:i},
              e('td',null, e('b',{style:{color:'var(--teal-d)'}}, a.code)),
              e('td',null, a.desc),
              e('td',null, e('span',{style:{fontSize:11,fontWeight:700,color:'var(--muted)'}}, a.type))
            ))
          )
        )
      )
    )
  );
}

// Summarise one student's saved progress. results maps chartId -> {accuracy,dept,...}
function progressOf(s){
  const r = s.results || {};
  const ids = Object.keys(r);
  const allocated = Object.entries(s.depts||{}).reduce((a,[dk,v])=>a+allocCount(v,((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length),0);
  let sum = 0, n = 0;
  const byDept = {};
  ids.forEach(id=>{
    const v = r[id] || {};
    if(typeof v.accuracy === 'number'){ sum += v.accuracy; n++; }
    const dk = v.dept || '?';
    byDept[dk] = (byDept[dk]||0) + 1;
  });
  return { worked: ids.length, allocated, avg: n ? Math.round(sum/n) : null, byDept };
}

// Full performance breakdown for one student: score band distribution,
// per-department accuracy, weakest codes, and a chart-by-chart list.
function AdminPerformance({ student, onClose }){
  const r = student.results || {};
  const ids = Object.keys(r).sort((a,b)=> (r[b].at||0)-(r[a].at||0));
  const scored = ids.filter(id=> typeof r[id].accuracy === 'number');
  const avg = scored.length ? Math.round(scored.reduce((a,id)=>a+r[id].accuracy,0)/scored.length) : null;

  const bands = { ship:0, solid:0, polish:0, weak:0 };
  scored.forEach(id=>{ const a=r[id].accuracy;
    if(a>=90) bands.ship++; else if(a>=75) bands.solid++; else if(a>=50) bands.polish++; else bands.weak++; });

  const perDept = {};
  ids.forEach(id=>{ const v=r[id]; const dk=v.dept||'?';
    if(!perDept[dk]) perDept[dk]={n:0,sum:0};
    perDept[dk].n++; if(typeof v.accuracy==='number') perDept[dk].sum+=v.accuracy; });

  // codes the student misses most often
  const missCount = {};
  ids.forEach(id=>{ (r[id].miss||[]).forEach(c=>{ missCount[c]=(missCount[c]||0)+1; }); });
  const topMiss = Object.entries(missCount).sort((a,b)=>b[1]-a[1]).slice(0,10);

  const wrongCount = {};
  ids.forEach(id=>{ (r[id].wrong||[]).forEach(w=>{
    const k = w[0] + (w[1] ? ' \u2192 ' + w[1] : '');
    wrongCount[k]=(wrongCount[k]||0)+1; }); });
  const topWrong = Object.entries(wrongCount).sort((a,b)=>b[1]-a[1]).slice(0,10);

  const band = a => a>=90?'#0E7C66' : a>=75?'#2F855A' : a>=50?'#B7791F' : '#B4232A';
  const box = (label,val,color)=> e('div',{style:{minWidth:96}},
    e('div',{style:{fontSize:11,fontWeight:800,letterSpacing:'.04em',color:'var(--muted)'}},label),
    e('div',{style:{fontSize:22,fontWeight:800,color:color||'inherit'}}, val));

  return e('div',{className:'result-overlay', onClick:ev=>{ if(ev.target.className==='result-overlay') onClose(); }},
    e('div',{className:'result-card', style:{maxWidth:860,maxHeight:'86vh',overflowY:'auto'}},
      e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}},
        e('div',null,
          e('h2',{style:{margin:0}}, student.name),
          e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:3}},
            student.id + (student.email ? ' \u00b7 '+student.email : ''))),
        e('button',{className:'btn', style:{background:'#fff',border:'1px solid var(--line)'}, onClick:onClose},'Close')),

      ids.length===0
        ? e('div',{style:{padding:'22px 4px',color:'var(--muted)',fontSize:13}},
            student.progressError
              ? ('Progress could not be read: ' + student.progressError)
              : 'This student has not completed any charts yet.')
        : e('div',null,
            e('div',{style:{display:'flex',gap:22,flexWrap:'wrap',padding:'12px 0 16px',borderBottom:'1px solid var(--line)'}},
              box('CHARTS DONE', ids.length),
              box('AVG ACCURACY', avg===null?'\u2014':avg+'%', avg===null?null:band(avg)),
              box('90%+', bands.ship, '#0E7C66'),
              box('75\u201389%', bands.solid, '#2F855A'),
              box('50\u201374%', bands.polish, '#B7791F'),
              box('UNDER 50%', bands.weak, '#B4232A')),

            e('div',{style:{padding:'14px 0',borderBottom:'1px solid var(--line)'}},
              e('div',{style:{fontSize:12,fontWeight:800,marginBottom:8}},'BY DEPARTMENT'),
              e('div',{style:{display:'flex',flexWrap:'wrap',gap:8}},
                Object.entries(perDept).map(([dk,v])=>{
                  const a = v.n ? Math.round(v.sum/v.n) : 0;
                  return e('span',{key:dk, style:{background:'var(--teal-lt)',borderRadius:7,padding:'6px 12px',fontSize:12.5,fontWeight:700,color:band(a)}},
                    (DEPTS[dk]? DEPTS[dk].name : dk) + ' \u00b7 ' + v.n + ' charts \u00b7 ' + a + '%');
                }))),

            (topMiss.length>0 || topWrong.length>0) && e('div',{style:{padding:'14px 0',borderBottom:'1px solid var(--line)'}},
              e('div',{style:{fontSize:12,fontWeight:800,marginBottom:8}},'WHERE THEY LOSE MARKS'),
              e('div',{style:{display:'flex',gap:26,flexWrap:'wrap'}},
                topMiss.length>0 && e('div',{style:{minWidth:250}},
                  e('div',{style:{fontSize:11,fontWeight:800,color:'var(--muted)',marginBottom:5}},'MOST OFTEN MISSED'),
                  topMiss.map(([c,n])=> e('div',{key:c, style:{fontSize:12.5,padding:'2px 0'}},
                    e('b',null,c), e('span',{style:{color:'var(--muted)'}}, ' \u00b7 missed '+n+'\u00d7')))),
                topWrong.length>0 && e('div',{style:{minWidth:250}},
                  e('div',{style:{fontSize:11,fontWeight:800,color:'var(--muted)',marginBottom:5}},'CODED INCORRECTLY'),
                  topWrong.map(([c,n])=> e('div',{key:c, style:{fontSize:12.5,padding:'2px 0'}},
                    e('b',null,c), e('span',{style:{color:'var(--muted)'}}, ' \u00b7 '+n+'\u00d7')))))),

            e('div',{style:{padding:'14px 0'}},
              e('div',{style:{fontSize:12,fontWeight:800,marginBottom:8}},'CHART BY CHART'),
              e('div',{style:{maxHeight:280,overflowY:'auto'}},
                ids.map(id=>{ const v=r[id];
                  return e('div',{key:id, style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid var(--line)'}},
                    e('div',null,
                      e('b',{style:{fontSize:12.5}}, id),
                      e('span',{style:{fontSize:11,color:'var(--muted)',marginLeft:8}},
                        (DEPTS[v.dept]? DEPTS[v.dept].name : (v.dept||'')) +
                        (v.at ? ' \u00b7 ' + new Date(v.at).toLocaleDateString() : ''))),
                    e('div',{style:{textAlign:'right'}},
                      e('b',{style:{fontSize:13,color:band(v.accuracy||0)}}, (v.accuracy||0)+'%'),
                      e('span',{style:{fontSize:11,color:'var(--muted)',marginLeft:8}},
                        (v.correct||0)+'/'+(v.total||0))));
                })))
          )
    ));
}

// --- document text extraction (no external libs; loaded on demand) ---
async function loadScript(src){
  return new Promise((res,rej)=>{
    if(document.querySelector('script[data-src="'+src+'"]')) return res();
    const s=document.createElement('script');
    s.src=src; s.setAttribute('data-src',src);
    s.onload=()=>res(); s.onerror=()=>rej(new Error('Could not load '+src));
    document.head.appendChild(s);
  });
}
async function extractPdfText(file){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  const pdfjs = window.pdfjsLib;
  pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({data:buf}).promise;
  let out='';
  for(let i=1;i<=pdf.numPages;i++){
    const page= await pdf.getPage(i);
    const tc  = await page.getTextContent();
    out += tc.items.map(it=>it.str).join(' ')+'\n\n';
  }
  return out;
}
async function extractDocxText(file){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  const buf = await file.arrayBuffer();
  const r = await window.mammoth.extractRawText({arrayBuffer:buf});
  return (r && r.value) || '';
}
// Validate a code against the loaded 171k code database.

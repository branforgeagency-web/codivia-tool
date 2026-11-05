/* CODIVIA platform — admin: bulk allocate, students, allocation modals */
// ============ BULK ALLOCATE (admin) ============
// Assigns a starter chart RANGE in EM, GENSURG, ED_PRO to every student who
// currently has NO allocation. Ranges CYCLE through each department pool so
// students get different starting points (no two adjacent students share a
// range until the pool is exhausted). Students who already have any allocation
// are never touched.
const BULK_DEPTS = ['EM','GENSURG','ED_PRO'];
const BULK_SIZE = 25;

function computeBulkPlan(students){
  // students with zero allocation
  const targets = students.filter(s=> !(s.depts && Object.keys(s.depts).length));
  const plan = []; // {student, depts:{dept:{start,end}}}
  // per-department rolling cursor
  const cursor = {}; BULK_DEPTS.forEach(dk=> cursor[dk]=0);
  targets.forEach(st=>{
    const depts={};
    BULK_DEPTS.forEach(dk=>{
      const pool = ((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length;
      if(pool<1) return;
      let start = cursor[dk]*BULK_SIZE + 1;
      // wrap when we run past the pool
      if(start > pool){ cursor[dk]=0; start = 1; }
      let end = Math.min(start + BULK_SIZE - 1, pool);
      depts[dk] = {start, end};
      cursor[dk]++;
      // if this block reached the pool end, reset cursor for next student
      if(end >= pool) cursor[dk]=0;
    });
    plan.push({ student: st, depts });
  });
  return { targets, plan };
}

function BulkAllocateForm({ students, onApply, onClose }){
  const { targets, plan } = React.useMemo(()=>computeBulkPlan(students),[students]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);

  const poolInfo = BULK_DEPTS.map(dk=>{
    const pool=((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length;
    return (DEPTS[dk]?DEPTS[dk].name:dk)+' ('+pool+')';
  }).join(', ');

  const apply = async ()=>{
    setBusy(true); setDone(0);
    await onApply(plan, (n)=>setDone(n));
    setBusy(false);
    onClose();
  };

  return e('div',null,
    e('div',{style:{padding:'20px 22px 0'}},
      e('h2',{style:{fontSize:17,fontWeight:800,color:'var(--navy)'}}, 'Bulk allocate starter charts'),
      e('p',{style:{fontSize:12.5,color:'var(--muted)',marginTop:4,lineHeight:1.6}},
        'Assigns '+BULK_SIZE+' charts each in '+poolInfo+' to every student who currently has NO allocation. '+
        'Ranges cycle through each pool so students get different starting points. Students who already have an allocation are left unchanged.')
    ),
    e('div',{style:{padding:'16px 22px'}},
      e('div',{style:{background:'var(--teal-lt)',border:'1px solid #f0d8c2',borderRadius:10,padding:'12px 14px',marginBottom:14}},
        e('div',{style:{fontSize:26,fontWeight:800,color:'var(--teal-d)'}}, targets.length),
        e('div',{style:{fontSize:12,fontWeight:700,color:'var(--ink)'}}, 'students will be allocated'),
        e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:4}},
          (students.length - targets.length)+' students already have allocations and will not be changed.')),
      targets.length>0 && e('div',{style:{fontSize:11.5,color:'var(--muted)'}},
        'Example — first student gets: '+ BULK_DEPTS.map(dk=>{
          const d=plan[0] && plan[0].depts[dk];
          return (DEPTS[dk]?DEPTS[dk].name:dk)+' '+(d?d.start+'\u2013'+d.end:'\u2014');
        }).join(',  ')),
      busy && e('div',{style:{marginTop:12,fontSize:12.5,fontWeight:800,color:'var(--teal-d)'}},
        'Allocating\u2026 '+done+' / '+targets.length)
    ),
    e('div',{className:'result-actions'},
      e('button',{style:{background:'#fff',border:'1px solid var(--line)',color:'var(--ink)'}, disabled:busy, onClick:onClose},'Cancel'),
      e('button',{style:{background:'var(--teal)',color:'#fff'}, disabled:busy || targets.length===0, onClick:apply},
        busy?'Working\u2026':('Allocate '+targets.length+' students'))
    )
  );
}

function AdminStudents({ students, onAllocate, onAdd, onPerf, onBulk }){
  const totals = students.reduce((acc,s)=>{
    const p = progressOf(s);
    acc.worked += p.worked; acc.allocated += p.allocated;
    if(p.worked > 0) acc.active++;
    if(s.progressError) acc.errors++;
    return acc;
  }, { worked:0, allocated:0, active:0, errors:0 });
  const cell = (label,val,color)=> e('div',null,
    e('div',{style:{fontSize:11,fontWeight:800,letterSpacing:'.04em',color:color||'var(--muted)'}},label),
    e('div',{style:{fontSize:22,fontWeight:800,color:color||'inherit'}}, val));
  return e('div',null,
    e('div',{className:'page-head', style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}},
      e('div',null, e('h1',null,'Students'), e('p',null,'Students who have registered. Allocate department charts to each.')),
      e('div',{style:{display:'flex',gap:8}},
        e('button',{className:'btn', style:{background:'#fff',border:'1px solid var(--line)',color:'var(--ink)'}, onClick:onBulk},'⚡ Bulk allocate'),
        e('button',{className:'btn btn-teal', onClick:onAdd},'🔄 Refresh'))
    ),
    e('div',{className:'card', style:{marginBottom:14}},
      e('div',{style:{padding:'14px 16px',display:'flex',gap:26,flexWrap:'wrap',alignItems:'center'}},
        cell('STUDENTS', students.length),
        cell('HAVE WORKED CHARTS', totals.active),
        cell('CHARTS COMPLETED', totals.worked),
        cell('TOTAL ALLOCATED', totals.allocated),
        totals.errors > 0 && cell('PROGRESS UNREADABLE', totals.errors, '#B4232A')
      )
    ),
    students.length===0
      ? e('div',{className:'card'}, e('div',{style:{padding:24,color:'var(--muted)',fontSize:13,textAlign:'center'}},
          'No students have registered yet. Once a student creates an account, tap Refresh to see them here.'))
      : students.map(s=>
      e('div',{key:s.uid||s.id, className:'card'},
        e('div',{className:'card-h'},
          e('div',null,
            e('h3',null, s.name),
            e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:2}}, s.id + (s.email ? ' · '+s.email : ''))),
          e('div',{style:{display:'flex',alignItems:'center',gap:14}},
            (function(){
              const p = progressOf(s);
              if(s.progressError) return e('span',{style:{fontSize:12,fontWeight:800,color:'#B4232A'}},
                'progress unreadable (' + s.progressError + ')');
              return e('div',{style:{textAlign:'right'}},
                e('div',{style:{fontSize:17,fontWeight:800,color: p.worked>0 ? 'var(--teal-d)' : 'var(--muted)'}},
                  p.worked + ' / ' + p.allocated),
                e('div',{style:{fontSize:11,fontWeight:700,color:'var(--muted)'}},
                  p.worked===0 ? 'not started'
                    : ('worked' + (p.avg!==null ? ' · ' + p.avg + '% avg' : ''))));
            })(),
            e('button',{className:'btn', style:{background:'#fff',border:'1px solid var(--line)',color:'var(--ink)'},
              onClick:()=>onPerf(s.id)},'View performance'),
            e('button',{className:'btn btn-teal', onClick:()=>onAllocate(s.id)},'Manage Access')
          )
        ),
        e('div',{style:{padding:'12px 16px'}},
          Object.keys(s.depts).length===0
            ? e('div',{style:{color:'var(--muted)',fontSize:13}}, 'No departments allocated yet.')
            : e('div',{style:{display:'flex',flexWrap:'wrap',gap:8}},
                Object.entries(s.depts).map(([dk,v])=>{
                  if(!DEPTS[dk]) return null;
                  const pool=((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length;
                  const rng=allocRange(v,pool);
                  const done = (progressOf(s).byDept[dk]) || 0;
                  const label = rng ? (DEPTS[dk].name+' · '+rng.start+'\u2013'+rng.end+' ('+done+'/'+allocCount(v,pool)+')')
                                    : (DEPTS[dk].name+' · '+done+'/0');
                  return e('span',{key:dk, style:{background:'var(--teal-lt)',color:'var(--teal-d)',borderRadius:7,padding:'6px 12px',fontSize:12.5,fontWeight:700}},
                    DEPTS[dk].icon+' '+label);
                })
              )
        )
      )
    )
  );
}

// ---- Admin modals: allocate access, add student ----
/* CODIVIA-BUILD-CHARTS150-0830 */
function AdminModal({ modal, students, allocate, allocateMany, addStudent, bulkAllocate, onClose }){
  return e('div',{className:'result-overlay', onClick:ev=>{ if(ev.target.className==='result-overlay') onClose(); }},
    e('div',{className:'result-card', style:{maxWidth:520}},
      modal.type==='allocate' && e(AllocateForm,{ student:students.find(s=>s.id===modal.studentId), students, allocate, allocateMany, onClose }),
      modal.type==='deptAllocate' && e(DeptAllocateForm,{ deptKey:modal.dept, students, allocate, onClose }),
      modal.type==='addStudent' && e(AddStudentForm,{ students, addStudent, onClose }),
      modal.type==='bulkAllocate' && e(BulkAllocateForm,{ students, onApply:bulkAllocate, onClose }),
    )
  );
}

function AllocateForm({ student, students, allocate, allocateMany, onClose }){
  // The student list reloads from Firestore, so students.find() can briefly
  // return undefined. Guard both the student and its depts map.
  const alloc = (student && student.depts) || {};
  // Draft holds a {from,to} per department. Legacy numeric allocations become
  // from=1, to=N. Empty department => from='' to='' (no access).
  const [drafts, setDrafts] = useState(()=>{
    const m={};
    activeDeptKeys().forEach(dk=>{
      const pool=((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length;
      const r=allocRange(alloc[dk], pool);
      m[dk] = r ? {from:String(r.start), to:String(r.end)} : {from:'', to:''};
    });
    return m;
  });

  const setF=(dk,f,v)=> setDrafts(x=>({...x, [dk]:{...x[dk], [f]:v.replace(/[^0-9]/g,'')}}));

  // Build the allocation payload from drafts: {dept: {start,end}} for filled rows.
  const build=()=>{
    const out={};
    activeDeptKeys().forEach(dk=>{
      const pool=((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length;
      const f=parseInt(drafts[dk].from,10), t=parseInt(drafts[dk].to,10);
      if(f>=1 && t>=f && t<=pool){ out[dk]={start:f, end:t}; }
    });
    return out;
  };

  // Per-department validation + overlap detection against OTHER students.
  const rowInfo=(dk)=>{
    const pool=((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length;
    const f=drafts[dk].from, t=drafts[dk].to;
    if(f==='' && t==='') return {state:'empty'};
    const fi=parseInt(f,10), ti=parseInt(t,10);
    if(isNaN(fi)||isNaN(ti)) return {state:'error', msg:'Enter both From and To'};
    if(fi<1) return {state:'error', msg:'From must be at least 1'};
    if(ti<fi) return {state:'error', msg:'To must be \u2265 From'};
    if(ti>pool) return {state:'error', msg:'To exceeds pool ('+pool+')'};
    // overlap check
    const clashes=[];
    (students||[]).forEach(other=>{
      if(!other || other.id===student.id) return;
      const ov=allocOverlap({start:fi,end:ti}, other.depts && other.depts[dk], pool);
      if(ov) clashes.push(other.name+' ('+ov.start+'\u2013'+ov.end+')');
    });
    return {state: clashes.length?'warn':'ok', count:ti-fi+1,
            msg: clashes.length ? ('overlaps '+clashes.join(', ')) : null};
  };

  const save=()=>{ if(student) allocateMany(student.id, build()); };

  if(!student){
    return e('div',null,
      e('div',{style:{padding:'26px 22px'}},
        e('h2',{style:{fontSize:17,fontWeight:800,color:'var(--navy)'}}, 'Student not found'),
        e('p',{style:{fontSize:13,color:'var(--muted)',marginTop:6,lineHeight:1.6}},
          'This student record could not be loaded \u2014 the list may still be refreshing. Close this dialog and try again.')),
      e('div',{className:'result-actions'},
        e('button',{style:{background:'var(--teal)',color:'#fff'}, onClick:onClose},'Close')));
  }
  const inp={width:64,padding:'7px 8px',border:'1px solid var(--line)',borderRadius:7,fontSize:13,textAlign:'center'};
  return e('div',null,
    e('div',{style:{padding:'20px 22px 0'}},
      e('h2',{style:{fontSize:17,fontWeight:800,color:'var(--navy)'}}, 'Manage Access \u2014 '+student.name),
      e('p',{style:{fontSize:12.5,color:'var(--muted)',marginTop:3}}, 'Assign each student a CHART RANGE per department (e.g. 1\u201325). Leave blank for no access. Ranges that overlap another student are flagged.')
    ),
    e('div',{style:{padding:'12px 22px',maxHeight:'52vh',overflowY:'auto'}},
      Object.entries(DEPTS).filter(([dk])=>deptHasCharts(dk)).map(([dk,d])=>{
        const pool=((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length;
        const info=rowInfo(dk);
        const border = info.state==='error' ? '#FCA5A5' : info.state==='warn' ? '#FBBF24' : 'var(--line)';
        return e('div',{key:dk, style:{padding:'9px 0',borderBottom:'1px solid var(--line-soft)'}},
          e('div',{style:{display:'flex',alignItems:'center',gap:10}},
            e('span',{style:{flex:1,fontSize:13,fontWeight:600}}, d.icon+' '+d.name),
            e('span',{style:{fontSize:11,color:'var(--muted)'}}, 'pool 1\u2013'+pool),
            e('span',{style:{fontSize:11,color:'var(--muted)'}}, 'From'),
            e('input',{value:drafts[dk].from, placeholder:'1', onChange:ev=>setF(dk,'from',ev.target.value),
              style:{...inp, borderColor:border}}),
            e('span',{style:{fontSize:11,color:'var(--muted)'}}, 'To'),
            e('input',{value:drafts[dk].to, placeholder:String(pool), onChange:ev=>setF(dk,'to',ev.target.value),
              style:{...inp, borderColor:border}}),
            e('span',{style:{width:64,fontSize:11,fontWeight:800,textAlign:'right',
              color: info.state==='ok'?'var(--teal-d)':'var(--muted)'}},
              info.count ? info.count+' chts' : '')
          ),
          info.msg && e('div',{style:{fontSize:11,fontWeight:700,marginTop:4,
            color: info.state==='error' ? '#B4232A' : '#B45309'}},
            (info.state==='warn'?'\u26a0 ':'')+info.msg)
        );
      })
    ),
    e('div',{className:'result-actions'},
      e('button',{style:{background:'#fff',border:'1px solid var(--line)',color:'var(--ink)'}, onClick:onClose},'Cancel'),
      e('button',{style:{background:'var(--teal)',color:'#fff'}, onClick:save},'Save Allocation')
    )
  );
}

function DeptAllocateForm({ deptKey, students, allocate, onClose }){
  const d = DEPTS[deptKey];
  const pool=((window.CHART_DATA&&window.CHART_DATA[deptKey])||[]).length;
  const [drafts, setDrafts] = useState(()=>{
    const m={}; students.forEach(s=>{
      const r=allocRange(s.depts && s.depts[deptKey], pool);
      m[s.id]= r?{from:String(r.start),to:String(r.end)}:{from:'',to:''};
    }); return m;
  });
  const setF=(sid,f,v)=> setDrafts(x=>({...x,[sid]:{...x[sid],[f]:v.replace(/[^0-9]/g,'')}}));
  const save = ()=>{
    Object.entries(drafts).forEach(([sid,r])=>{
      const f=parseInt(r.from,10), t=parseInt(r.to,10);
      allocate(sid, deptKey, (f>=1&&t>=f&&t<=pool)?{start:f,end:t}:0);
    });
    onClose();
  };
  // overlap check for a given student's draft range against the OTHER drafts
  const overlapMsg=(sid)=>{
    const r=drafts[sid]; const f=parseInt(r.from,10), t=parseInt(r.to,10);
    if(!(f>=1&&t>=f)) return null;
    const cl=[];
    students.forEach(o=>{
      if(o.id===sid) return;
      const ro=drafts[o.id]; const of=parseInt(ro.from,10), ot=parseInt(ro.to,10);
      if(!(of>=1&&ot>=of)) return;
      const lo=Math.max(f,of), hi=Math.min(t,ot);
      if(lo<=hi) cl.push(o.name+' ('+lo+'\u2013'+hi+')');
    });
    return cl.length?('\u26a0 overlaps '+cl.join(', ')):null;
  };
  const inp={width:60,padding:'7px 8px',border:'1px solid var(--line)',borderRadius:7,fontSize:13,textAlign:'center'};
  return e('div',null,
    e('div',{style:{padding:'20px 22px 0'}},
      e('h2',{style:{fontSize:17,fontWeight:800,color:'var(--navy)'}}, d.icon+' '+d.name),
      e('p',{style:{fontSize:12.5,color:'var(--muted)',marginTop:3}}, 'Assign a chart RANGE from this department (pool 1\u2013'+pool+') to each student. Blank = no access.')
    ),
    e('div',{style:{padding:'12px 22px',maxHeight:'52vh',overflowY:'auto'}},
      students.map(s=>{
        const om=overlapMsg(s.id);
        const bc=om?'#FBBF24':'var(--line)';
        return e('div',{key:s.id, style:{padding:'9px 0',borderBottom:'1px solid var(--line-soft)'}},
          e('div',{style:{display:'flex',alignItems:'center',gap:10}},
            e('span',{style:{flex:1,fontSize:13,fontWeight:600}}, s.name),
            e('span',{style:{fontSize:11,color:'var(--muted)'}}, 'From'),
            e('input',{value:drafts[s.id].from, placeholder:'1', onChange:ev=>setF(s.id,'from',ev.target.value), style:{...inp,borderColor:bc}}),
            e('span',{style:{fontSize:11,color:'var(--muted)'}}, 'To'),
            e('input',{value:drafts[s.id].to, placeholder:String(pool), onChange:ev=>setF(s.id,'to',ev.target.value), style:{...inp,borderColor:bc}})
          ),
          om && e('div',{style:{fontSize:11,fontWeight:700,marginTop:4,color:'#B45309'}}, om)
        );
      })
    ),
    e('div',{className:'result-actions'},
      e('button',{style:{background:'#fff',border:'1px solid var(--line)',color:'var(--ink)'}, onClick:onClose},'Cancel'),
      e('button',{style:{background:'var(--teal)',color:'#fff'}, onClick:save},'Save Allocation')
    )
  );
}

function AddStudentForm({ students, addStudent, onClose }){
  return e('div',null,
    e('div',{style:{padding:'20px 22px 0'}},
      e('h2',{style:{fontSize:17,fontWeight:800,color:'var(--navy)'}}, 'Students register themselves'),
      e('p',{style:{fontSize:12.5,color:'var(--muted)',marginTop:3}}, 'You no longer add students manually.')
    ),
    e('div',{style:{padding:'16px 22px', fontSize:13.5, color:'var(--ink)', lineHeight:1.6}},
      'Each student creates their own account from the sign-in screen using their email and a password. ',
      'They automatically receive a unique Student ID (STU-00001, STU-00002…). ',
      e('br'),e('br'),
      'Once they have registered, tap ', e('b',null,'Refresh'), ' and they will appear in the Students list. ',
      'You can then use ', e('b',null,'Manage Access'), ' to allocate department charts to them.'
    ),
    e('div',{className:'result-actions'},
      e('button',{style:{background:'var(--teal)',color:'#fff'}, onClick:()=>{ addStudent(); }},'Refresh & Close')
    )
  );
}

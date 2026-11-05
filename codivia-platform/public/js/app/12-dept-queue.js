/* CODIVIA platform — department chart queue */
function queueFields(record){
  const out = {mrn:'', dos:'', dosLabel:'', payer:'', facility:'', ptype:''};
  if(!record) return out;
  const lines = String(record).split('\n');
  for(let i=0;i<lines.length && i<14;i++){
    const l = lines[i];
    let m;
    if(!out.mrn && (m = l.match(/^MRN:\s*([^\s]+)/))) out.mrn = m[1];
    if(!out.payer && (m = l.match(/^Insurance:\s*(.+)$/))) out.payer = m[1].trim();
    if(!out.facility && (m = l.match(/^Facility:\s*(.+)$/))) out.facility = m[1].trim();
    if(!out.dos && (m = l.match(/^Date of Service:\s*(.+)$/))) out.dos = m[1].trim();
    if(!out.dos && (m = l.match(/^SOC Date:\s*(.+)$/))){ out.dos = m[1].trim(); out.dosLabel='Start of care'; }
    if(!out.dos && (m = l.match(/^Admission Date:\s*(.+)$/))){ out.dos = m[1].trim(); out.dosLabel='Admission'; }
    if(!out.ptype && (m = l.match(/^Patient type:\s*(New patient|Established patient)/i))) out.ptype = m[1];
  }
  // a header line may carry a second field after the date (e.g. "Arrival Time: 15:27")
  if(out.dos){
    const cut = out.dos.match(/^(.*?)\s{2,}[A-Z][A-Za-z ]{2,}:\s*\S/);
    if(cut) out.dos = cut[1].trim();
    else {
      const cut2 = out.dos.match(/^(\S+)\s+[A-Z][A-Za-z ]{2,}:\s*\S/);
      if(cut2) out.dos = cut2[1].trim();
    }
  }
  return out;
}

function DeptQueue({ dept, stu, results, onBack, onOpen }){
  const d = DEPTS[dept];
  const pool = ((window.CHART_DATA&&window.CHART_DATA[dept])||[]);
  // The student works their ALLOCATED slice of the department pool — not the whole
  // pool. Allocation is deterministic (first N) so a student's queue is stable
  // across sessions and matches the number shown on the dashboard.
  // Slice the student's ALLOCATED RANGE of the department pool (e.g. charts
  // 26..50), not just the first N. Backward compatible: a legacy numeric
  // allocation N is treated as range 1..N.
  const [_sA,_sB] = allocSlice(stu.depts && stu.depts[dept], pool.length);
  const charts = pool.slice(_sA, _sB);
  const [shown, setShown] = useState(50);
  const [q, setQ] = useState('');
  const filtered = q.trim()
    ? charts.filter(c=>{ const h=queueFields(c.record);
        return (c.id+' '+h.mrn+' '+h.dos+' '+h.payer+' '+h.facility).toLowerCase().includes(q.toLowerCase().trim()); })
    : charts;
  const visible = filtered.slice(0, shown);
  const doneIds = Object.keys(results);
  const workedCount = charts.filter(c=>doneIds.includes(c.id)).length;
  const accs = charts.filter(c=>results[c.id]).map(c=>results[c.id].accuracy);
  const avgAcc = accs.length ? Math.round(accs.reduce((a,b)=>a+b,0)/accs.length) : 0;
  // 'alloc' here is the number of charts allocated to this student in this dept,
  // which is exactly the length of their sliced queue.
  const allocCountForDept = charts.length;
  const pct = allocCountForDept ? Math.round((workedCount/allocCountForDept)*100) : 0;

  return e('div',null,
    e('button',{className:'backbtn', onClick:onBack},'← All departments'),
    e('div',{className:'page-head'},
      e('h1',null, d.icon+' '+d.name),
      e('p',null, allocCountForDept+' charts allocated to you \u00b7 '+(d.elements||[]).map(x=>ELEMENT_LABELS[x]||x).join(' \u00b7 '))
    ),
    e('div',{className:'stat-row'},
      e(Stat,{k:'Allocated', v:allocCountForDept, s:'assigned to you'}),
      e(Stat,{k:'Worked', v:workedCount, s:'this session', teal:true}),
      e(Stat,{k:'Avg Accuracy', v:(avgAcc||0)+'%', s:'across worked'}),
      e(Stat,{k:'Progress', v:pct+'%', s:'toward certificate'}),
    ),
    e('div',{className:'card'},
      e('div',{className:'card-h', style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}},
        e('h3',null,'Your Chart Queue'),
        e('input',{value:q, placeholder:'Search MRN, date, payer, facility\u2026', style:{fontSize:12,padding:'6px 10px',border:'1px solid var(--line)',borderRadius:6,minWidth:220},
          onChange:ev=>{ setQ(ev.target.value); setShown(50); }})
      ),
      e('table',null,
        e('thead',null,e('tr',null,['MRN','Date of Service','Insurance','Facility','Status','Action'].map(h=>e('th',{key:h},h)))),
        e('tbody',null,
          visible.map(c=>{
            const res = results[c.id];
            const h = queueFields(c.record);
            return e('tr',{key:c.id},
              e('td',null, e('div',{style:{fontWeight:600,fontFamily:"'SF Mono',monospace",fontSize:12.5}}, h.mrn||'\u2014'),
                e('div',{style:{fontSize:11,color:'var(--muted)'}}, c.id,
                  h.ptype? e('span',{style:{marginLeft:6,fontSize:9.5,fontWeight:800,letterSpacing:.2,
                    padding:'1px 6px',borderRadius:4,
                    color: /^new/i.test(h.ptype)?'#0B6B57':'#5A6472',
                    background: /^new/i.test(h.ptype)?'#e6f7f2':'#eef1f4',
                    border:'1px solid '+(/^new/i.test(h.ptype)?'#a8dfd0':'#dfe4ea')}},
                    /^new/i.test(h.ptype)?'NEW':'EST') : null,
                  c.handwritten? e('span',{style:{marginLeft:6,fontSize:10,fontWeight:700,color:'#9a6b12',background:'#fff2cf',border:'1px solid #e3bd5c',borderRadius:4,padding:'1px 5px',letterSpacing:.3}},'\u270e HANDWRITTEN') : null)),
              e('td',null, e('div',{style:{fontSize:12.5}}, h.dos||'\u2014'),
                h.dosLabel && e('div',{style:{fontSize:10.5,color:'var(--muted)'}}, h.dosLabel)),
              e('td',null, e('div',{style:{fontSize:12.5}}, h.payer||'\u2014')),
              e('td',null, e('div',{style:{fontSize:12.5}}, h.facility||'\u2014')),
              e('td',null, res
                ? e('span',{className:'acc '+(res.accuracy>=90?'hi':res.accuracy>=75?'mid':'lo')}, res.accuracy+'%')
                : e('span',{style:{color:'var(--muted)',fontSize:12}}, 'Not started')),
              e('td',null, e('button',{className:'btn '+(res?'btn-ghost':'btn-teal'), onClick:()=>onOpen(c)}, res?'Redo':'Code it'))
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

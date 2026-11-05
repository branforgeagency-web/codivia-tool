/* CODIVIA platform — department picker + progress view */
function DeptSelect({ stu, stats, onSelect }){
  return e('div',null,
    e('div',{className:'page-head'},
      e('h1',null,'My Charts'),
      e('p',null,'Select a department to work your allocated charts.')
    ),
    (function(){
      const entries = Object.entries(stu.depts).filter(([dk])=>DEPTS[dk] && deptHasCharts(dk));
      if(!entries.length){
        return e('div',{className:'card',style:{padding:'26px 6px',textAlign:'center'}},
          e('div',{style:{fontSize:15,fontWeight:800,color:'var(--navy)',marginBottom:6}},
            'No departments allocated yet'),
          e('div',{style:{fontSize:13,color:'var(--muted)',lineHeight:1.6,maxWidth:520,margin:'0 auto'}},
            'Your trainer assigns which coding departments you work. Once a department is allocated to your account, its chart queue will appear here.'));
      }
      return e('div',{className:'dept-grid'},
        entries.map(([dk, alloc])=>{
          const d = DEPTS[dk]; const st = stats.perDept[dk] || {worked:0, avg:0};
          const pool = ((window.CHART_DATA&&window.CHART_DATA[dk])||[]).length;
          const _rng = allocRange(alloc, pool);
          const assigned = allocCount(alloc, pool);
          const remaining = Math.max(0, assigned - st.worked);
          const rangeLabel = _rng ? ('charts '+_rng.start+'\u2013'+_rng.end) : null;
          return e('div',{key:dk, className:'dept-card', onClick:()=>onSelect(dk)},
            e('div',{className:'ico'}, d.icon),
            e('h3',null, d.name),
            e(ElementTiles,{dept:d, setting:d.group==='setting'}),
            e('div',{className:'alloc'},
              e('span',null, rangeLabel || 'Your allocation'),
              e('b',null, assigned)
            ),
            e('div',{className:'dept-sub', style:{fontSize:11,color:'var(--muted)',marginTop:6}}, st.worked+' worked \u00b7 '+remaining+' remaining')
          );
        })
      );
    })()
  );
}

// ---- Progress view ----
function ProgressView({ stu, stats }){
  return e('div',null,
    e('div',{className:'page-head'}, e('h1',null,'My Progress'),
      e('p',null,'Your coding accuracy by department. These numbers feed your certificate and resume.')),
    e('div',{className:'stat-row'},
      e(Stat,{k:'Total Worked', v:stats.totalWorked, teal:true}),
      e(Stat,{k:'Overall Accuracy', v:stats.overallAvg+'%'}),
    ),
    e('div',{className:'card'},
      e('div',{className:'card-h'}, e('h3',null,'Department Breakdown')),
      e('div',{style:{padding:'6px 16px 14px'}},
        Object.entries(stu.depts).map(([dk,alloc])=>{
          const d=DEPTS[dk]; const st=stats.perDept[dk];
          const pctToCert = Math.min(100, Math.round((st.worked/CERT_THRESHOLD)*100));
          return e('div',{key:dk, style:{padding:'14px 0', borderBottom:'1px solid var(--line-soft)'}},
            e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}},
              e('span',{style:{fontWeight:700}}, d.icon+' '+d.name),
              e('span',{className:'acc '+(st.avg>=90?'hi':st.avg>=75?'mid':'lo')}, st.worked>0?st.avg+'%':'—')
            ),
            e('div',{style:{height:8,background:'var(--line-soft)',borderRadius:4,overflow:'hidden'}},
              e('div',{style:{height:'100%',width:pctToCert+'%',background:st.certified?'var(--ok)':'var(--teal)'}})
            ),
            e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:5}},
              st.worked+' / '+CERT_THRESHOLD+' charts toward certificate'+(st.certified?' · ✓ unlocked':''))
          );
        })
      )
    )
  );
}

/* CODIVIA platform — student dashboard */
// ---- Dashboard (landing tile) ----
function Dashboard({ stu, stats, onGoDept, onNav }){
  return e('div',null,
    e('div',{className:'page-head'},
      e('h1',null,'Welcome back, '+stu.name.split(' ')[0]),
      e('p',null,'Work your allocated charts, track progress, and build your certificate and resume.')
    ),
    e('div',{className:'stat-row'},
      e(Stat,{k:'Charts Worked', v:stats.totalWorked, s:'across all depts', teal:true}),
      e(Stat,{k:'Overall Accuracy', v:stats.overallAvg+'%', s:'audited average'}),
      e(Stat,{k:'Departments', v:Object.keys(stu.depts).filter(deptHasCharts).length, s:'allocated to you'}),
      e(Stat,{k:'Certificate', v:stats.anyCertified?'Ready':'Locked', s:stats.anyCertified?'download now':'reach '+CERT_THRESHOLD+' charts'}),
    ),
    e('div',{className:'card'},
      e('div',{className:'card-h'}, e('h3',null,'Your Departments')),
      e('div',{style:{padding:16}},
        (function(){
          const entries = Object.entries(stu.depts).filter(([dk])=>DEPTS[dk] && deptHasCharts(dk));
          if(!entries.length){
            return e('div',{style:{padding:'26px 6px',textAlign:'center'}},
              e('div',{style:{fontSize:15,fontWeight:800,color:'var(--navy)',marginBottom:6}},
                'No departments allocated yet'),
              e('div',{style:{fontSize:13,color:'var(--muted)',lineHeight:1.6,maxWidth:520,margin:'0 auto'}},
                'Your trainer assigns which coding departments you work. Once a department is allocated to your account it will appear here with your chart queue.'));
          }
          return e('div',{className:'dept-grid'},
            entries.map(([dk,alloc])=>{
              const d = DEPTS[dk]; const st = stats.perDept[dk] || {worked:0, avg:0};
              return e('div',{key:dk, className:'dept-card', onClick:()=>onGoDept(dk)},
                e('div',{className:'ico'}, d.icon),
                e('h3',null, d.name),
                e(ElementTiles,{dept:d, setting:d.group==='setting'}),
                e('div',{className:'alloc'}, e('span',null,'Progress'), e('b',null, st.worked+' / '+alloc)),
                e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:6}}, st.worked>0 ? st.avg+'% avg accuracy' : 'Not started')
              );
            })
          );
        })()
      )
    ),
    e(GuidelinesPanel,null)
  );
}

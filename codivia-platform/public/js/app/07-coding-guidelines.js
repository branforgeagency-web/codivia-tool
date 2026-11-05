/* CODIVIA platform — coding guidelines reference views */
// ---- Coding Guidelines: reference for ICD-10-CM, CPT, HCPCS and ICD-10-PCS ----
function CodingGuide(){
  const ORDER = ['icd','cpt','pcs','hcpcs'];
  const [set, setSet] = React.useState('icd');
  const [open, setOpen] = React.useState({});
  const [q, setQ] = React.useState('');
  const g = CODING_GUIDE[set];

  const ql = q.trim().toLowerCase();
  const items = React.useMemo(()=>{
    const all = g.chapters;
    if(!ql) return all;
    return all.filter(c=>{
      let hay = (c.ref||'')+' '+c.t+' '+c.r+' '+c.i;
      (c.s||[]).forEach(sb=>{ hay += ' '+sb.ref+' '+sb.t+' '+(sb.b||'')+' '+(sb.p||[]).join(' '); });
      return hay.toLowerCase().indexOf(ql)!==-1;
    });
  },[g, ql]);

  const opened = (k)=> ql ? true : !!open[set+':'+k];
  const toggle = (k)=> setOpen(o=>Object.assign({}, o, {[set+':'+k]: !o[set+':'+k]}));
  const ruleCount = (c)=> (c.s||[]).reduce((n,sb)=>n+((sb.p||[]).length), 0);

  const setBtn = (id)=>{
    const c = CODING_GUIDE[id];
    const on = set===id;
    return e('button',{ key:id, onClick:()=>{ setSet(id); setQ(''); },
      style:{flex:'1 1 160px',textAlign:'left',padding:'11px 14px',borderRadius:10,cursor:'pointer',
        border:'2px solid '+(on?c.color:'var(--line)'),
        background: on? c.color+'12' : '#fff'}},
      e('div',{style:{fontSize:13.5,fontWeight:800,color: on?c.color:'var(--ink)'}}, c.label),
      e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:2}}, c.sub));
  };

  return e('div',{className:'page'},
    e('div',{className:'page-head'}, e('h1',null,'Coding Guidelines'),
      e('p',{style:{color:'var(--muted)',margin:'4px 0 0',fontSize:13}},
        'Chapter-by-chapter guidance, laid out the way the codebooks are. Open a chapter to see its numbered guideline subsections.')),

    e('div',{style:{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}, ORDER.map(setBtn)),

    e('div',{style:{position:'relative',marginBottom:12}},
      e('input',{ value:q,
        placeholder:'Search '+g.label+' \u2014 e.g. sepsis, hypertension, modifier 25, 7th character\u2026',
        onChange:ev=>setQ(ev.target.value),
        style:{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid var(--line)',borderRadius:10,outline:'none',boxSizing:'border-box'} }),
      e('span',{style:{position:'absolute',right:14,top:12,fontSize:11,color:'var(--muted)'}},
        items.length+' of '+g.chapters.length)),

    items.length===0
      ? e('div',{className:'card',style:{padding:'28px 16px',textAlign:'center',color:'var(--muted)',fontSize:13.5}},
          'Nothing matches that term in '+g.label+'. Try a shorter word or another code set.')
      : e('div',null, items.map((c,ci)=>{
          const isOpen = opened(c.r);
          return e('div',{key:ci, className:'card', style:{marginBottom:10,overflow:'hidden'}},
            e('div',{ onClick:()=>toggle(c.r),
              style:{display:'flex',alignItems:'center',gap:11,padding:'13px 16px',cursor:'pointer',
                borderLeft:'4px solid '+g.color}},
              e('span',{style:{fontSize:12,color:'var(--muted)',minWidth:12}}, isOpen?'\u25be':'\u25b8'),
              e('span',{style:{fontSize:10.5,fontWeight:800,color:'#fff',background:g.color,
                padding:'3px 8px',borderRadius:5,whiteSpace:'nowrap',fontFamily:"'SF Mono',monospace"}}, c.r),
              e('div',{style:{flex:1,minWidth:0}},
                e('div',{style:{fontSize:14,fontWeight:800,color:'var(--navy)'}},
                  (typeof c.n === 'number' ? 'Chapter '+c.n+' \u2014 ' : '') + c.t),
                c.ref && c.ref!==c.r && e('div',{style:{fontSize:10.5,color:'var(--muted)',marginTop:1,
                  fontFamily:"'SF Mono',monospace"}}, c.ref)),
              !isOpen && e('span',{style:{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}},
                (c.s||[]).length+' sections \u00b7 '+ruleCount(c)+' rules')),

            isOpen && e('div',{style:{padding:'0 18px 16px 18px'}},
              e('p',{style:{fontSize:13,color:'var(--ink)',lineHeight:1.65,margin:'0 0 14px',
                paddingLeft:16,borderLeft:'2px solid '+g.color+'40'}}, c.i),
              (c.s||[]).map((sb,si)=>
                e('div',{key:si, style:{marginBottom:14,paddingLeft:16}},
                  e('div',{style:{display:'flex',alignItems:'baseline',gap:8,marginBottom:4}},
                    e('span',{style:{fontSize:11,fontWeight:800,color:g.color,
                      fontFamily:"'SF Mono',monospace",minWidth:22}},
                      (c.ref && typeof c.n === 'number' ? c.ref+'.' : '')+sb.ref),
                    e('span',{style:{fontSize:13,fontWeight:800,color:'var(--navy)'}}, sb.t)),
                  sb.b && e('p',{style:{fontSize:12.5,color:'var(--muted)',lineHeight:1.6,
                    margin:'0 0 7px',paddingLeft:30}}, sb.b),
                  e('ul',{style:{margin:0,paddingLeft:48}},
                    (sb.p||[]).map((pt,pi)=>
                      e('li',{key:pi, style:{fontSize:12.5,color:'var(--ink)',lineHeight:1.6,marginBottom:5}}, pt))))))
          );
        })),

    e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:14,lineHeight:1.6}},
      'CODIVIA teaching reference. The chapter and section structure follows the official code sets so students learn to navigate the real books; all guidance is summarised in CODIVIA\u2019s own words and is not a reproduction of the ICD-10-CM Official Guidelines, the AMA CPT codebook, or any other publication. For production coding, always verify against the current official guidelines and your payer policies.')
  );
}

// ---- Coding Guidelines reference (educational reference, 2026 CPT/IPPS principles) ----
function GuidelinesPanel(){
  const [tab,setTab]=React.useState('em');
  const tabs=[['em','E/M MDM Levels'],['ed','ED Levels (99281-99285)'],['ip','Inpatient / DRG Basics']];
  const th={textAlign:'left',padding:'8px 10px',fontSize:12,color:'var(--muted)',borderBottom:'1px solid var(--line)',fontWeight:700};
  const td={padding:'8px 10px',fontSize:12.5,borderBottom:'1px solid var(--line)',verticalAlign:'top'};
  return e('div',{className:'card',style:{marginTop:18}},
    e('div',{className:'card-h',style:{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}},
      e('h3',null,'📋 Coding Guidelines Reference'),
      e('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},
        tabs.map(([id,lbl])=>e('button',{key:id,onClick:()=>setTab(id),
          style:{padding:'5px 11px',fontSize:11.5,borderRadius:7,cursor:'pointer',border:'1px solid var(--line)',
            background: tab===id?'var(--teal)':'transparent', color: tab===id?'#fff':'var(--muted)', fontWeight:600}}, lbl))
      )
    ),
    e('div',{style:{padding:16}},
      tab==='em' && e('div',null,
        e('p',{style:{fontSize:12.5,color:'var(--muted)',marginTop:0,marginBottom:12}},'2026 CPT E/M leveling is driven by Medical Decision Making (MDM) — the highest 2 of 3 elements below set the level.'),
        e('table',{style:{width:'100%',borderCollapse:'collapse'}},
          e('thead',null,e('tr',null,
            e('th',{style:th},'MDM Level'),e('th',{style:th},'Problems Addressed'),e('th',{style:th},'Data Reviewed'),e('th',{style:th},'Risk'))),
          e('tbody',null,
            [['Straightforward','1 self-limited / minor problem','Minimal or none','Minimal'],
             ['Low','2+ self-limited; or 1 stable chronic; or 1 acute uncomplicated','Limited (1-2 tests; review of prior notes)','Low'],
             ['Moderate','1 chronic w/ exacerbation; or 1 acute w/ systemic symptoms; or 1 undiagnosed new problem','Moderate (3+ tests; independent interpretation; external discussion)','Moderate (Rx management; minor surgery w/ risk factors)'],
             ['High','1 chronic w/ severe exacerbation; or acute illness/injury threatening life or bodily function','Extensive (multiple tests; independent interpretation; external consult)','High (drug therapy needing intensive monitoring; hospitalization; emergency major surgery)']
            ].map((r,idx)=>e('tr',{key:idx},r.map((c,ci)=>e('td',{key:ci,style:Object.assign({},td, ci===0?{fontWeight:700,color:'var(--ink)',whiteSpace:'nowrap'}:{})},c))))
          )
        )
      ),
      tab==='ed' && e('div',null,
        e('p',{style:{fontSize:12.5,color:'var(--muted)',marginTop:0,marginBottom:12}},'Emergency Department E/M (99281-99285). No new vs established distinction; level is set by MDM complexity.'),
        e('table',{style:{width:'100%',borderCollapse:'collapse'}},
          e('thead',null,e('tr',null,e('th',{style:th},'Code'),e('th',{style:th},'MDM'),e('th',{style:th},'Typical presentation'))),
          e('tbody',null,
            [['99281','N/A (may not require physician)','Nurse-only visit; minimal presenting problem'],
             ['99282','Low','Minor / self-limited — simple sprain, minor laceration, allergy, localized edema'],
             ['99283','Low-to-Moderate','Acute uncomplicated — bronchitis, URI, fever, uncomplicated headache, N/V'],
             ['99284','Moderate','Acute w/ systemic symptoms or workup — asthma exacerbation, chest pain, renal colic, cellulitis, fracture'],
             ['99285','High','Life/limb threat — appendicitis, stroke, status asthmaticus, syncope, sepsis, altered mental status']
            ].map((r,idx)=>e('tr',{key:idx},r.map((c,ci)=>e('td',{key:ci,style:Object.assign({},td, ci===0?{fontWeight:700,color:'var(--teal)',whiteSpace:'nowrap'}:{})},c))))
          )
        )
      ),
      tab==='ip' && e('div',null,
        e('p',{style:{fontSize:12.5,color:'var(--muted)',marginTop:0,marginBottom:12}},'Inpatient facility coding uses ICD-10-CM (diagnoses) + ICD-10-PCS (procedures), grouped to an MS-DRG for payment.'),
        e('ul',{style:{fontSize:12.5,lineHeight:1.7,paddingLeft:18,margin:0}},
          e('li',null,e('b',null,'Principal Diagnosis: '),'the condition established after study to be chiefly responsible for the admission (UHDDS definition).'),
          e('li',null,e('b',null,'Secondary Dx / CC / MCC: '),'comorbidities and complications. A CC (Complication/Comorbidity) or MCC (Major CC) can shift the DRG to a higher-weighted tier.'),
          e('li',null,e('b',null,'ICD-10-PCS: '),'7-character codes for inpatient procedures — Section, Body System, Root Operation, Body Part, Approach, Device, Qualifier.'),
          e('li',null,e('b',null,'MS-DRG: '),'each inpatient stay maps to one Medicare Severity DRG based on principal dx, procedures, and CC/MCC level; the DRG weight drives reimbursement.'),
          e('li',null,e('b',null,'POA: '),'Present-On-Admission indicators are required on inpatient diagnoses and affect CC/MCC capture.')
        )
      ),
      e('p',{style:{fontSize:10.5,color:'var(--muted)',marginTop:14,marginBottom:0,fontStyle:'italic'}},'Educational reference summarizing 2026 CPT and CMS IPPS coding principles. Always verify against current official AMA CPT and CMS/ICD-10 guidelines for production coding.')
    )
  );
}

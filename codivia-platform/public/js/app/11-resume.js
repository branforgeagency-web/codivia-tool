/* CODIVIA platform — resume builder */
// ---- Resume view (template gallery + auto-filled preview) ----
// ---- Résumé design system: palettes × layout engines = 30+ distinct templates ----
// ---- Résumé design system: one professional "Medical Coding Fresher" layout × color palettes ----
const RESUME_PALETTES = [
  { key:'teal',    name:'Teal',    accent:'#00A88E', deep:'#0B3B36', tint:'#E7F6F3', ink:'#0B1D3A' },
  { key:'navy',    name:'Navy',    accent:'#12395F', deep:'#0B1D3A', tint:'#EAF0F6', ink:'#0B1D3A' },
  { key:'gold',    name:'Gold',    accent:'#C6902A', deep:'#5A4410', tint:'#FBF3DF', ink:'#2A2410' },
  { key:'coral',   name:'Coral',   accent:'#D85A30', deep:'#7A2E14', tint:'#FCEBE3', ink:'#2A1710' },
  { key:'forest',  name:'Forest',  accent:'#2E7D4F', deep:'#123B24', tint:'#E7F4EC', ink:'#10231A' },
  { key:'plum',    name:'Plum',    accent:'#7A3B7A', deep:'#3D1D3D', tint:'#F4E9F4', ink:'#241024' },
  { key:'slate',   name:'Slate',   accent:'#475569', deep:'#1F2937', tint:'#EEF1F5', ink:'#1F2937' },
  { key:'crimson', name:'Crimson', accent:'#B0273C', deep:'#5C0F1C', tint:'#FBE7EB', ink:'#2A0A10' },
  { key:'indigo',  name:'Indigo',  accent:'#4F46B8', deep:'#241F6B', tint:'#ECEBFA', ink:'#1A1640' },
];
// Color-only templates (one shared fresher structure)
// 7 structural layouts × 5 palettes = 35 distinct résumé templates
const RESUME_LAYOUTS = [
  { key:'header-band', name:'Header Band',    desc:'Bold colour header, 2-col body' },
  { key:'left-rail',   name:'Left Rail',      desc:'Dark sidebar left, content right' },
  { key:'right-rail',  name:'Right Rail',     desc:'Content left, dark sidebar right' },
  { key:'top-banner',  name:'Photo Banner',   desc:'Centered photo banner, single col' },
  { key:'minimal',     name:'Minimal ATS',    desc:'Clean single column, ATS-friendly' },
  { key:'timeline',    name:'Timeline',       desc:'Accent timeline down the experience' },
  { key:'compact',     name:'Compact Grid',   desc:'Tight two-column card grid' },
];
const RESUME_TEMPLATES = (function(){
  const pals = RESUME_PALETTES.slice(0,5); // 5 palettes → 7×5 = 35
  const out=[];
  RESUME_LAYOUTS.forEach(function(L){
    pals.forEach(function(P){
      out.push({ id:L.key+'-'+P.key, name:P.name+' '+L.name, layout:L.key, pal:P, fam:L.name });
    });
  });
  return out;
})();

// Default résumé content — seeded from the student + their CODIVIA coding record
function defaultResume(stu, stats, target){
  const d = DEPTS[target] || {name:'Emergency Department', elements:[]};
  const st = (stats.perDept[target]||{worked:0,avg:0});
  const certId = 'CDV-2026-'+String(1000+parseInt(stu.id.replace(/\D/g,''))).padStart(6,'0');
  const worked = st.worked || 0;
  const deptShort = (d.name||'Emergency Department').replace(' — Professional','').replace(' — Facility','');
  const shortTag = deptShort==='Emergency Department'?'ED':deptShort.toUpperCase();
  return {
    name: stu.name,
    role: 'CERTIFIED MEDICAL CODER | FRESHER',
    phone: '', email: '', location: 'Coimbatore, Tamil Nadu', linkedin: '', photo: '',
    summary: 'Certified medical coding fresher with hands-on '+deptShort.toLowerCase()+' coding practice using CODIVIA coding software. Completed '+worked+' '+deptShort+' charts with exposure to diagnosis and procedure code assignment, documentation review, guideline application, and code validation. Strong foundation in anatomy, medical terminology, ICD-10-CM, CPT, HCPCS Level II, and healthcare compliance. Seeking an entry-level medical coding opportunity to contribute accuracy, productivity, and continuous learning.',
    stats3: [
      { big: worked+' '+shortTag+' CHARTS', small:'Practical coding completed' },
      { big: 'CERTIFIED', small:'CPC (in progress)' },
      { big: 'CODIVIA', small:'Coding software exposure' }
    ],
    experience: [{
      role: deptShort+' Coding Practice — CODIVIA Coding Software',
      period: '2026 | '+worked+' '+shortTag+' Charts Completed',
      bullets: [
        'Reviewed and coded '+worked+' simulated '+deptShort.toLowerCase()+' charts in CODIVIA, applying ICD-10-CM, CPT, and HCPCS Level II concepts.',
        'Identified principal diagnoses, secondary conditions, symptoms, procedures, injections, and supplies from clinical documentation.',
        'Applied official coding guidelines, sequencing rules, inclusion/exclusion notes, and documentation-specific code selection.',
        'Practised evaluation and management concepts, medical necessity review, and accurate capture of comorbidities.',
        'Used coding feedback and validation results to improve accuracy, speed, and rationale-based code selection.',
        'Maintained confidentiality and followed HIPAA-aware handling principles during simulated chart practice.'
      ]
    }],
    certifications: [ { name:'CPC (Certified Professional Coder)', by:'AAPC', id:'', valid:'' } ],
    education: [ { degree:'Degree / Diploma', school:'College / University, City', period:'Year', detail:'Percentage / CGPA' } ],
    projects: [ '' ],
    coreSkills: ['ICD-10-CM Coding','CPT Coding','HCPCS Level II','ED Chart Coding','Diagnosis Sequencing','E/M Fundamentals','Medical Necessity','Code Validation'],
    clinical: ['Anatomy & Physiology','Medical Terminology','Pathophysiology','Pharmacology Basics','Disease Processes','Clinical Documentation'],
    tools: ['CODIVIA Coding Software','Encoder / Code Book Navigation','Microsoft Word & Excel','Healthcare Documentation Review'],
    strengths: ['Attention to Detail','Analytical Thinking','Accuracy & Quality Focus','Time Management','Quick Learning','Team Collaboration'],
    languages: ['English — Professional','Tamil — Native']
  };
}

// ---- small render helpers ----
function _mono(a){ return (a||[]).filter(function(x){return x&&(''+x).trim();}); }
function _monogram(name){
  return (name||'').split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0];}).join('').toUpperCase() || 'CV';
}
function _photo(R, w, ratio, radius, borderColor){
  ratio=ratio||0.78; radius=(radius==null?8:radius);
  if(R.photo) return e('img',{src:R.photo, style:{width:w,height:w*ratio,borderRadius:radius,objectFit:'cover',border:'2px solid '+(borderColor||'rgba(255,255,255,.6)')}});
  return e('div',{style:{width:w,height:w*ratio,borderRadius:radius,background:'rgba(255,255,255,.16)',border:'2px solid '+(borderColor||'rgba(255,255,255,.45)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:w*0.32,fontWeight:900,color:'#fff'}}, _monogram(R.name));
}
function _photoTint(R, w, P, round){
  var rad=round?'50%':10;
  if(R.photo) return e('img',{src:R.photo, style:{width:w,height:round?w:w*0.82,borderRadius:rad,objectFit:'cover',border:'2px solid '+P.accent+'55'}});
  return e('div',{style:{width:w,height:round?w:w*0.82,borderRadius:rad,background:P.tint,border:'2px solid '+P.accent+'55',display:'flex',alignItems:'center',justifyContent:'center',fontSize:w*0.32,fontWeight:900,color:P.accent}}, _monogram(R.name));
}
function _contact(R, sep, color){
  return [R.location,R.phone,R.email,R.linkedin].filter(function(x){return x&&(''+x).trim();}).join(sep||'  |  ');
}
// heading styles
function _hUnderline(txt, P){
  return e('div',{style:{fontSize:12,fontWeight:900,letterSpacing:.5,textTransform:'uppercase',color:P.deep,margin:'12px 0 7px',paddingBottom:4,borderBottom:'2px solid '+P.accent}}, txt);
}
function _hPill(txt, P){
  return e('div',{style:{display:'inline-block',fontSize:11,fontWeight:900,letterSpacing:.5,textTransform:'uppercase',color:'#fff',background:P.accent,borderRadius:20,padding:'3px 12px',margin:'12px 0 8px'}}, txt);
}
function _hBar(txt, P){
  return e('div',{style:{fontSize:12,fontWeight:900,letterSpacing:.5,textTransform:'uppercase',color:P.deep,margin:'12px 0 7px',paddingLeft:9,borderLeft:'4px solid '+P.accent}}, txt);
}
function _hPlain(txt, P){
  return e('div',{style:{fontSize:11.5,fontWeight:900,letterSpacing:1,textTransform:'uppercase',color:P.ink,margin:'13px 0 6px'}}, txt);
}
// bullet list block
function _bullets(items, P, sz){
  return e('ul',{style:{margin:'2px 0 8px',paddingLeft:16}},
    _mono(items).map(function(b,j){return e('li',{key:j,style:{fontSize:sz||11.5,lineHeight:1.5,color:'#334',marginBottom:3}}, b);}));
}
// experience block (H is a heading fn)
function _expBlock(R, P, H){
  var out=[]; var exp=_mono(R.experience); if(!exp.length) return out;
  out.push(H('Practical Medical Coding Experience', P));
  exp.forEach(function(x,i){
    out.push(e('div',{key:'x'+i, style:{marginBottom:10}},
      e('div',{style:{fontSize:12.5,fontWeight:800,color:P.ink}}, x.role||''),
      x.period?e('div',{style:{fontSize:11,fontStyle:'italic',color:'#556',marginBottom:4}}, x.period):null,
      _bullets(x.bullets, P)));
  });
  return out;
}
function _certEduProj(R, P, H){
  var out=[];
  var certs=_mono(R.certifications);
  if(certs.length){ out.push(H('Certification', P));
    certs.forEach(function(x,i){ out.push(e('div',{key:'c'+i,style:{marginBottom:6}},
      e('div',{style:{fontSize:12,fontWeight:800,color:P.ink}}, x.name||''),
      e('div',{style:{fontSize:11,color:'#556'}}, [x.by,x.id?('Credential ID: '+x.id):'',x.valid?('Valid Through: '+x.valid):''].filter(Boolean).join(' | ')))); });
  }
  var edu=_mono(R.education);
  if(edu.length){ out.push(H('Education', P));
    edu.forEach(function(x,i){ out.push(e('div',{key:'e'+i,style:{marginBottom:6}},
      e('div',{style:{fontSize:12,fontWeight:800,color:P.ink}}, x.degree||''),
      e('div',{style:{fontSize:11,color:'#556'}}, [x.school,x.period,x.detail].filter(Boolean).join(' | ')))); });
  }
  var proj=_mono(R.projects);
  if(proj.length){ out.push(H('Academic Project / Internship', P)); out.push(_bullets(proj, P)); }
  return out;
}
// right-side skills sections, dark or light
function _rcSection(title, items, P, onDark){
  var list=_mono(items); if(!list.length) return null;
  var soft = onDark?'rgba(255,255,255,.72)':P.deep;
  var txtc = onDark?'#fff':'#334';
  return e('div',{key:title, style:{marginBottom:12}},
    e('div',{style:{fontSize:10.5,fontWeight:900,letterSpacing:.5,textTransform:'uppercase',color:soft,marginBottom:6,paddingBottom:3,borderBottom:'1.5px solid '+(onDark?'rgba(255,255,255,.3)':P.accent+'55')}}, title),
    list.map(function(s,i){return e('div',{key:i,style:{fontSize:11,color:txtc,lineHeight:1.45,marginBottom:3,paddingLeft:10,position:'relative'}},
      e('span',{style:{position:'absolute',left:0,color:onDark?'#fff':P.accent,fontWeight:900}},'·'), s);}));
}
function _skillChips(items, P){
  return e('div',{style:{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}},
    _mono(items).map(function(s){return e('span',{key:s,style:{fontSize:10.5,fontWeight:700,background:P.tint,color:P.deep,border:'1px solid '+P.accent+'33',borderRadius:5,padding:'3px 8px'}}, s);}));
}
function _statBoxes(R, P){
  if(!_mono(R.stats3).length) return null;
  return e('div',{style:{display:'flex',gap:10,marginBottom:6}},
    R.stats3.map(function(s,i){return e('div',{key:i,style:{flex:1,background:P.tint,border:'1px solid '+P.accent+'33',borderRadius:8,padding:'10px 8px',textAlign:'center'}},
      e('div',{style:{fontSize:13,fontWeight:900,color:P.deep}}, s.big),
      e('div',{style:{fontSize:9.5,color:'#556',marginTop:2}}, s.small));}));
}
function _rightStack(R, P, onDark){
  return [ _rcSection('Core Coding Skills', R.coreSkills, P, onDark),
    _rcSection('Clinical Knowledge', R.clinical, P, onDark),
    _rcSection('Tools', R.tools, P, onDark),
    _rcSection('Professional Strengths', R.strengths, P, onDark),
    _rcSection('Languages', R.languages, P, onDark) ];
}

// ============ LAYOUT ENGINES ============
function L_headerBand(R,P){
  return e('div',{style:{background:'#fff',border:'0.5px solid var(--line)',borderRadius:12,overflow:'hidden'}},
    e('div',{style:{display:'flex',alignItems:'center',gap:16,padding:'22px 26px',background:P.accent,color:'#fff'}},
      e('div',{style:{flex:1}},
        e('div',{style:{fontSize:26,fontWeight:900,letterSpacing:.5,lineHeight:1.05}}, (R.name||'').toUpperCase()),
        e('div',{style:{fontSize:12.5,fontWeight:700,letterSpacing:1,marginTop:4,opacity:.95}}, R.role||''),
        e('div',{style:{fontSize:11,marginTop:7,opacity:.92}}, _contact(R))),
      _photo(R,90)),
    R.summary?e('div',{style:{padding:'16px 26px 0'}}, _hUnderline('Professional Summary',P),
      e('div',{style:{fontSize:12,lineHeight:1.55,color:'#334'}}, R.summary)):null,
    e('div',{style:{padding:'12px 26px 0'}}, _statBoxes(R,P)),
    e('div',{style:{display:'flex',gap:20,padding:'14px 26px 26px'}},
      e('div',{style:{flex:'1 1 60%'}}, _expBlock(R,P,_hUnderline), _certEduProj(R,P,_hUnderline)),
      e('div',{style:{flex:'1 1 40%',background:'#fafbfc',borderRadius:10,padding:'14px 16px',alignSelf:'flex-start'}}, _rightStack(R,P,false))));
}
function L_rail(R,P,side){
  var rail = e('div',{style:{width:'35%',background:P.deep,color:'#fff',padding:'24px 18px'}},
    e('div',{style:{textAlign:'center',marginBottom:14}}, _photo(R,86,0.86,'50%')),
    e('div',{style:{fontSize:19,fontWeight:900,textAlign:'center',lineHeight:1.1}}, R.name),
    e('div',{style:{fontSize:10.5,opacity:.9,textAlign:'center',letterSpacing:.5,marginTop:3,marginBottom:8}}, R.role),
    e('div',{style:{height:3,width:34,background:P.accent,margin:'0 auto 14px',borderRadius:2}}),
    e('div',{style:{fontSize:10,textTransform:'uppercase',letterSpacing:.6,opacity:.7,marginBottom:5}},'Contact'),
    e('div',{style:{fontSize:11,lineHeight:1.7,marginBottom:12}},
      [R.phone,R.email,R.location,R.linkedin].filter(function(x){return x&&(''+x).trim();}).map(function(x,i){return e('div',{key:i},x);})),
    _rightStack(R,P,true));
  var body = e('div',{style:{flex:1,padding:'22px 24px'}},
    R.summary?[_hUnderline('Professional Summary',P), e('div',{key:'s',style:{fontSize:12,lineHeight:1.55,color:'#334',marginBottom:10}}, R.summary)]:null,
    _statBoxes(R,P), e('div',{style:{height:8}}),
    _expBlock(R,P,_hUnderline), _certEduProj(R,P,_hUnderline));
  var kids = side==='right'?[body,rail]:[rail,body];
  return e('div',{style:{background:'#fff',border:'0.5px solid var(--line)',borderRadius:12,overflow:'hidden',display:'flex',minHeight:440}}, kids);
}
function L_topBanner(R,P){
  return e('div',{style:{background:'#fff',border:'0.5px solid var(--line)',borderRadius:12,overflow:'hidden'}},
    e('div',{style:{background:'linear-gradient(135deg,'+P.accent+','+P.deep+')',color:'#fff',padding:'26px 20px 22px',textAlign:'center'}},
      e('div',{style:{display:'flex',justifyContent:'center',marginBottom:12}}, _photo(R,84,1,'50%')),
      e('div',{style:{fontSize:25,fontWeight:900,letterSpacing:.5}}, (R.name||'').toUpperCase()),
      e('div',{style:{fontSize:12,fontWeight:700,letterSpacing:1,marginTop:4,opacity:.95}}, R.role),
      e('div',{style:{fontSize:11,marginTop:8,opacity:.9}}, _contact(R))),
    e('div',{style:{padding:'18px 30px 26px'}},
      R.summary?[_hPill('Professional Summary',P), e('div',{key:'s',style:{fontSize:12,lineHeight:1.55,color:'#334',marginBottom:10}}, R.summary)]:null,
      _statBoxes(R,P), e('div',{style:{height:10}}),
      _expBlock(R,P,_hPill), _certEduProj(R,P,_hPill),
      _hPill('Core Coding Skills',P), _skillChips(R.coreSkills,P),
      _hPill('Clinical Knowledge',P), _skillChips(R.clinical,P),
      e('div',{style:{display:'flex',gap:18}},
        e('div',{style:{flex:1}}, _hPill('Tools',P), _skillChips(R.tools,P)),
        e('div',{style:{flex:1}}, _hPill('Languages',P), _skillChips(R.languages,P)))));
}
function L_minimal(R,P){
  return e('div',{style:{background:'#fff',border:'0.5px solid var(--line)',borderRadius:12,overflow:'hidden',padding:'26px 30px'}},
    e('div',{style:{textAlign:'center',borderBottom:'2px solid '+P.accent,paddingBottom:12,marginBottom:12}},
      e('div',{style:{fontSize:26,fontWeight:900,letterSpacing:1,color:P.ink}}, (R.name||'').toUpperCase()),
      e('div',{style:{fontSize:12,fontWeight:700,letterSpacing:1.5,color:P.accent,marginTop:3}}, R.role),
      e('div',{style:{fontSize:11,color:'#556',marginTop:6}}, _contact(R,'  •  '))),
    R.summary?[_hPlain('Professional Summary',P), e('div',{key:'s',style:{fontSize:12,lineHeight:1.55,color:'#334',marginBottom:6}}, R.summary)]:null,
    _expBlock(R,P,_hPlain), _certEduProj(R,P,_hPlain),
    _hPlain('Core Coding Skills',P), e('div',{style:{fontSize:11.5,color:'#334',lineHeight:1.6,marginBottom:6}}, _mono(R.coreSkills).join('  ·  ')),
    _hPlain('Clinical Knowledge',P), e('div',{style:{fontSize:11.5,color:'#334',lineHeight:1.6,marginBottom:6}}, _mono(R.clinical).join('  ·  ')),
    _hPlain('Tools',P), e('div',{style:{fontSize:11.5,color:'#334',lineHeight:1.6,marginBottom:6}}, _mono(R.tools).join('  ·  ')),
    _hPlain('Strengths & Languages',P), e('div',{style:{fontSize:11.5,color:'#334',lineHeight:1.6}}, _mono(R.strengths).concat(_mono(R.languages)).join('  ·  ')));
}
function L_timeline(R,P){
  var exp=_mono(R.experience);
  var expNode = exp.length ? e('div',null, _hBar('Practical Medical Coding Experience',P),
    e('div',{style:{position:'relative',paddingLeft:20,marginLeft:4}},
      e('div',{style:{position:'absolute',left:4,top:4,bottom:4,width:2,background:P.accent+'55'}}),
      exp.map(function(x,i){return e('div',{key:i,style:{position:'relative',marginBottom:12}},
        e('div',{style:{position:'absolute',left:-20,top:3,width:10,height:10,borderRadius:'50%',background:P.accent,border:'2px solid #fff',boxShadow:'0 0 0 2px '+P.accent+'55'}}),
        e('div',{style:{fontSize:12.5,fontWeight:800,color:P.ink}}, x.role||''),
        x.period?e('div',{style:{fontSize:11,fontStyle:'italic',color:'#556',marginBottom:4}}, x.period):null,
        _bullets(x.bullets,P));}))) : null;
  return e('div',{style:{background:'#fff',border:'0.5px solid var(--line)',borderRadius:12,overflow:'hidden'}},
    e('div',{style:{display:'flex',alignItems:'center',gap:16,padding:'20px 26px',borderBottom:'3px solid '+P.accent}},
      _photoTint(R,72,P,true),
      e('div',{style:{flex:1}},
        e('div',{style:{fontSize:25,fontWeight:900,color:P.ink,letterSpacing:.5}}, (R.name||'').toUpperCase()),
        e('div',{style:{fontSize:12,fontWeight:700,letterSpacing:1,color:P.accent,marginTop:3}}, R.role),
        e('div',{style:{fontSize:11,color:'#556',marginTop:6}}, _contact(R)))),
    e('div',{style:{padding:'16px 26px 0'}}, _statBoxes(R,P)),
    e('div',{style:{display:'flex',gap:20,padding:'12px 26px 26px'}},
      e('div',{style:{flex:'1 1 60%'}},
        R.summary?[_hBar('Professional Summary',P), e('div',{key:'s',style:{fontSize:12,lineHeight:1.55,color:'#334',marginBottom:8}}, R.summary)]:null,
        expNode, _certEduProj(R,P,_hBar)),
      e('div',{style:{flex:'1 1 40%'}}, _rightStack(R,P,false))));
}
function L_compact(R,P){
  function card(title, kids){ return e('div',{style:{border:'1px solid '+P.accent+'22',borderRadius:9,padding:'10px 12px',marginBottom:10,background:'#fff'}},
    e('div',{style:{fontSize:10.5,fontWeight:900,letterSpacing:.5,textTransform:'uppercase',color:P.accent,marginBottom:6}}, title), kids); }
  return e('div',{style:{background:P.tint,border:'0.5px solid var(--line)',borderRadius:12,overflow:'hidden',padding:16}},
    e('div',{style:{display:'flex',alignItems:'center',gap:14,background:'#fff',borderRadius:10,padding:'14px 16px',marginBottom:12,borderLeft:'5px solid '+P.accent}},
      _photoTint(R,64,P,false),
      e('div',{style:{flex:1}},
        e('div',{style:{fontSize:22,fontWeight:900,color:P.ink}}, (R.name||'').toUpperCase()),
        e('div',{style:{fontSize:11.5,fontWeight:700,letterSpacing:.8,color:P.accent}}, R.role),
        e('div',{style:{fontSize:10.5,color:'#556',marginTop:4}}, _contact(R,'  ·  ')))),
    R.summary?card('Professional Summary', e('div',{style:{fontSize:11.5,lineHeight:1.5,color:'#334'}}, R.summary)):null,
    e('div',{style:{display:'flex',gap:12}},
      e('div',{style:{flex:'1 1 58%'}},
        card('Experience', e('div',null, _mono(R.experience).map(function(x,i){return e('div',{key:i},
          e('div',{style:{fontSize:12,fontWeight:800,color:P.ink}}, x.role||''),
          x.period?e('div',{style:{fontSize:10.5,fontStyle:'italic',color:'#556',marginBottom:3}}, x.period):null,
          _bullets(x.bullets,P,11));}))),
        card('Certification & Education', e('div',null, _certEduProj(R,P,function(t,PP){return e('div',{style:{fontSize:10.5,fontWeight:900,textTransform:'uppercase',color:PP.accent,margin:'6px 0 4px'}},t);})))),
      e('div',{style:{flex:'1 1 42%'}},
        card('Core Skills', _skillChips(R.coreSkills,P)),
        card('Clinical Knowledge', _skillChips(R.clinical,P)),
        card('Tools & Languages', _skillChips(_mono(R.tools).concat(_mono(R.languages)),P)))));
}

// dispatcher
function renderResume(layoutKey, R, P){
  switch(layoutKey){
    case 'left-rail':  return L_rail(R,P,'left');
    case 'right-rail': return L_rail(R,P,'right');
    case 'top-banner': return L_topBanner(R,P);
    case 'minimal':    return L_minimal(R,P);
    case 'timeline':   return L_timeline(R,P);
    case 'compact':    return L_compact(R,P);
    default:           return L_headerBand(R,P);
  }
}

// ---- form field helpers ----
function _fld(label, val, onChange, opts){
  opts=opts||{};
  return e('label',{style:{display:'block',marginBottom:10}},
    e('div',{style:{fontSize:11,fontWeight:700,color:'#475569',marginBottom:3}}, label),
    opts.area
      ? e('textarea',{value:val||'', onChange:function(ev){onChange(ev.target.value);}, rows:opts.rows||3,
          style:{width:'100%',border:'1px solid var(--line)',borderRadius:8,padding:'8px 10px',fontSize:12.5,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}})
      : e('input',{value:val||'', placeholder:opts.ph||'', onChange:function(ev){onChange(ev.target.value);},
          style:{width:'100%',border:'1px solid var(--line)',borderRadius:8,padding:'8px 10px',fontSize:12.5,boxSizing:'border-box'}})
  );
}
function _sectionHead(title){
  return e('div',{style:{fontSize:12,fontWeight:800,color:'var(--navy)',textTransform:'uppercase',letterSpacing:.5,margin:'16px 0 8px',paddingBottom:5,borderBottom:'2px solid var(--line)'}}, title);
}
function _rowCard(children, onRemove){
  return e('div',{style:{border:'1px solid var(--line)',borderRadius:8,padding:10,marginBottom:8,position:'relative',background:'#fafbfc'}},
    e('button',{onClick:onRemove, title:'Remove',
      style:{position:'absolute',top:6,right:6,border:'none',background:'#fee',color:'#c0392b',borderRadius:5,width:22,height:22,cursor:'pointer',fontWeight:800,fontSize:13,lineHeight:1}},'×'),
    children);
}
function _addBtn(label, onClick){
  return e('button',{onClick:onClick,
    style:{border:'1px dashed var(--teal)',background:'#e7f6f3',color:'#0B3B36',borderRadius:8,padding:'7px 12px',fontSize:12,fontWeight:700,cursor:'pointer',width:'100%'}},'+ '+label);
}

function ResumeView({ stu, stats }){
  const worked = Object.entries(stats.perDept).filter(([,st])=>st.worked>0);
  const firstDept = worked[0]?.[0] || Object.keys(stu.depts)[0];
  const [tpl, setTpl] = useState(RESUME_TEMPLATES[0].id);
  const [famFilter, setFamFilter] = useState('all');
  const [showGallery, setShowGallery] = useState(true);
  const [R, setR] = useState(()=>defaultResume(stu, stats, firstDept));

  const set = (k,v)=> setR(prev=>Object.assign({}, prev, {[k]:v}));
  const setList = (k, i, field, v)=> setR(prev=>{ const a=(prev[k]||[]).slice(); a[i]=Object.assign({},a[i],{[field]:v}); return Object.assign({},prev,{[k]:a}); });
  const setListBullets = (k, i, v)=> setR(prev=>{ const a=(prev[k]||[]).slice(); a[i]=Object.assign({},a[i],{bullets:v.split('\n').map(s=>s.trim()).filter(Boolean)}); return Object.assign({},prev,{[k]:a}); });
  const addRow = (k, blank)=> setR(prev=>Object.assign({},prev,{[k]:(prev[k]||[]).concat([blank])}));
  const rmRow = (k,i)=> setR(prev=>{ const a=(prev[k]||[]).slice(); a.splice(i,1); return Object.assign({},prev,{[k]:a}); });
  const setSimpleList = (k, i, v)=> setR(prev=>{ const a=(prev[k]||[]).slice(); a[i]=v; return Object.assign({},prev,{[k]:a}); });
  const setCSV = (k, v)=> set(k, v.split(',').map(s=>s.trim()).filter(Boolean));

  const onPhoto = (ev)=>{
    const f=ev.target.files&&ev.target.files[0]; if(!f) return;
    const rd=new FileReader(); rd.onload=()=>set('photo', rd.result); rd.readAsDataURL(f);
  };

  const active = RESUME_TEMPLATES.find(t=>t.id===tpl) || RESUME_TEMPLATES[0];
  const fams = ['all'].concat(RESUME_LAYOUTS.map(l=>l.name));
  const shown = RESUME_TEMPLATES.filter(t=> famFilter==='all' ? true : t.fam===famFilter);

  return e('div',null,
    e('div',{className:'page-head'}, e('h1',null,'Resume Builder'),
      e('p',null,'35 professional resume designs — auto-filled from your CODIVIA work and fully editable. Pick a template, fill in your details, then Export PDF.')),

    // template gallery (collapsible, real mini-previews)
    e('div',{className:'card', style:{marginBottom:14}},
      e('div',{className:'card-h', style:{cursor:'pointer'}, onClick:()=>setShowGallery(s=>!s)},
        e('h3',null,'Choose a template'),
        e('span',{style:{fontSize:12,color:'var(--muted)'}}, active.name+' · '+shown.length+' shown · '+(showGallery?'hide ▾':'show ▸'))),
      showGallery?e('div',null,
        e('div',{style:{display:'flex',gap:8,flexWrap:'wrap',padding:'12px 14px 0'}},
          fams.map(f=>e('button',{key:f, onClick:()=>setFamFilter(f),
            style:{fontSize:12,fontWeight:700,padding:'6px 12px',borderRadius:20,cursor:'pointer',
              border:'1px solid '+(famFilter===f?'var(--teal)':'var(--line)'),
              background:famFilter===f?'var(--teal)':'#fff', color:famFilter===f?'#fff':'var(--ink)'}},
            f==='all'?'All styles':f))),
        e('div',{style:{padding:14,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:14}},
          shown.map(t=>{
            const selected=tpl===t.id;
            return e('button',{key:t.id, onClick:()=>setTpl(t.id),
              style:{border:selected?'2px solid '+t.pal.accent:'1px solid var(--line)',borderRadius:10,padding:0,
                overflow:'hidden',background:'#fff',cursor:'pointer',textAlign:'left',
                boxShadow:selected?'0 4px 14px '+t.pal.accent+'33':'0 1px 3px rgba(0,0,0,.06)'}},
              e('div',{style:{height:186,overflow:'hidden',background:'#f4f6f8',position:'relative'}},
                e('div',{style:{position:'absolute',top:0,left:0,width:640,transform:'scale(0.235)',transformOrigin:'top left'}},
                  renderResume(t.layout, R, t.pal))),
              e('div',{style:{padding:'8px 10px',display:'flex',alignItems:'center',gap:6}},
                e('span',{style:{width:11,height:11,borderRadius:3,background:t.pal.accent,flex:'0 0 auto'}}),
                e('span',{style:{fontSize:11,fontWeight:700}}, t.name)));
          }))
      ):null
    ),

    // two-pane: editor | live preview
    e('div',{style:{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}},
      // ---- editor ----
      e('div',{className:'card', style:{flex:'1 1 340px',minWidth:300,maxWidth:440,padding:16,maxHeight:'82vh',overflowY:'auto'}},
        _sectionHead('Header & contact'),
        e('div',{style:{display:'flex',gap:12,alignItems:'center',marginBottom:10}},
          R.photo? e('img',{src:R.photo,style:{width:54,height:54,borderRadius:8,objectFit:'cover'}})
                 : e('div',{style:{width:54,height:54,borderRadius:8,background:active.pal.accent,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}, _monogram(R.name)),
          e('label',{style:{fontSize:12,fontWeight:700,color:'#0B3B36',cursor:'pointer'}},
            'Upload photo',
            e('input',{type:'file',accept:'image/*',onChange:onPhoto,style:{display:'none'}})),
          R.photo? e('button',{onClick:()=>set('photo',''),style:{fontSize:11,color:'#c0392b',border:'none',background:'none',cursor:'pointer'}},'remove'):null),
        _fld('Full name', R.name, v=>set('name',v)),
        _fld('Title line', R.role, v=>set('role',v), {ph:'CERTIFIED MEDICAL CODER | FRESHER'}),
        _fld('Location', R.location, v=>set('location',v)),
        _fld('Phone', R.phone, v=>set('phone',v), {ph:'+91 ...'}),
        _fld('Email', R.email, v=>set('email',v)),
        _fld('LinkedIn URL', R.linkedin, v=>set('linkedin',v)),

        _sectionHead('Professional summary'),
        _fld('Summary', R.summary, v=>set('summary',v), {area:true,rows:5}),

        _sectionHead('Highlight boxes (3)'),
        (R.stats3||[]).map((x,i)=>_rowCard([
          _fld('Big text', x.big, v=>setList('stats3',i,'big',v)),
          _fld('Small text', x.small, v=>setList('stats3',i,'small',v))
        ], ()=>rmRow('stats3',i))),
        (R.stats3||[]).length<3?_addBtn('Add box', ()=>addRow('stats3',{big:'',small:''})):null,

        _sectionHead('Practical experience'),
        (R.experience||[]).map((x,i)=>_rowCard([
          _fld('Role / title', x.role, v=>setList('experience',i,'role',v)),
          _fld('Period / detail', x.period, v=>setList('experience',i,'period',v)),
          _fld('Bullets (one per line)', (x.bullets||[]).join('\n'), v=>setListBullets('experience',i,v), {area:true,rows:6})
        ], ()=>rmRow('experience',i))),
        _addBtn('Add experience', ()=>addRow('experience',{role:'',period:'',bullets:[]})),

        _sectionHead('Certification'),
        (R.certifications||[]).map((x,i)=>_rowCard([
          _fld('Certification', x.name, v=>setList('certifications',i,'name',v)),
          _fld('Certifying body', x.by, v=>setList('certifications',i,'by',v)),
          _fld('Credential ID', x.id, v=>setList('certifications',i,'id',v)),
          _fld('Valid through', x.valid, v=>setList('certifications',i,'valid',v))
        ], ()=>rmRow('certifications',i))),
        _addBtn('Add certification', ()=>addRow('certifications',{name:'',by:'',id:'',valid:''})),

        _sectionHead('Education'),
        (R.education||[]).map((x,i)=>_rowCard([
          _fld('Degree / diploma', x.degree, v=>setList('education',i,'degree',v)),
          _fld('College / university, city', x.school, v=>setList('education',i,'school',v)),
          _fld('Year', x.period, v=>setList('education',i,'period',v)),
          _fld('Percentage / CGPA', x.detail, v=>setList('education',i,'detail',v))
        ], ()=>rmRow('education',i))),
        _addBtn('Add education', ()=>addRow('education',{degree:'',school:'',period:'',detail:''})),

        _sectionHead('Project / internship (optional)'),
        (R.projects||[]).map((x,i)=>_rowCard([
          _fld('Project / internship', x, v=>setSimpleList('projects',i,v), {area:true,rows:2})
        ], ()=>rmRow('projects',i))),
        _addBtn('Add project', ()=>addRow('projects','')),

        _sectionHead('Right column lists'),
        _fld('Core coding skills (comma separated)', (R.coreSkills||[]).join(', '), v=>setCSV('coreSkills',v), {area:true,rows:2}),
        _fld('Clinical knowledge (comma separated)', (R.clinical||[]).join(', '), v=>setCSV('clinical',v), {area:true,rows:2}),
        _fld('Tools (comma separated)', (R.tools||[]).join(', '), v=>setCSV('tools',v), {area:true,rows:2}),
        _fld('Professional strengths (comma separated)', (R.strengths||[]).join(', '), v=>setCSV('strengths',v), {area:true,rows:2}),
        _fld('Languages (comma separated)', (R.languages||[]).join(', '), v=>setCSV('languages',v))
      ),

      // ---- live preview ----
      e('div',{style:{flex:'2 1 460px',minWidth:320}},
        e('div',{style:{display:'flex',gap:10,alignItems:'center',marginBottom:12}},
          e('span',{style:{fontSize:12,color:'var(--muted)'}}, 'Live preview'),
          e('button',{className:'btn btn-teal', style:{marginLeft:'auto'}, onClick:doPrint},'⬇ Export PDF')),
        e('div',{className:'print-area', style:{maxWidth:800}},
          renderResume(active.layout, R, active.pal))
      )
    )
  );
}

// Parse only the encounter header from a chart record.
// Deliberately excludes diagnosis, chief complaint and title — the student
// must open the chart and read the note to work out what was treated.

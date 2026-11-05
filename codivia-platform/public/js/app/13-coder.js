/* CODIVIA platform — coding screen: record tabs, code entry, scoring, results */
// ---------------- CODER (live coding with full code DB) ----------------
// Common MS-DRG options for the inpatient DRG picker
const DRG_OPTIONS = [
  '871 — Septicemia w/o MV >96hr w MCC','872 — Septicemia w/o MV >96hr w/o MCC',
  '291 — Heart failure & shock w MCC','292 — Heart failure & shock w CC','293 — Heart failure & shock w/o CC/MCC',
  '193 — Simple pneumonia & pleurisy w MCC','194 — Simple pneumonia & pleurisy w CC','195 — Simple pneumonia & pleurisy w/o CC/MCC',
  '190 — COPD w MCC','191 — COPD w CC','192 — COPD w/o CC/MCC',
  '377 — GI hemorrhage w MCC','378 — GI hemorrhage w CC','379 — GI hemorrhage w/o CC/MCC',
  '338 — Appendectomy w complicated principal dx w MCC','339 — Appendectomy w complicated principal dx w CC','343 — Appendectomy w/o complicated principal dx w/o CC/MCC',
  '417 — Laparoscopic cholecystectomy w/o CDE w MCC','418 — Laparoscopic cholecystectomy w/o CDE w CC','419 — Laparoscopic cholecystectomy w/o CDE w/o CC/MCC',
  '480 — Hip & femur procedures except major joint w MCC','481 — Hip & femur procedures except major joint w CC','482 — Hip & femur procedures except major joint w/o CC/MCC',
  '469 — Major hip & knee joint replacement w MCC','470 — Major hip & knee joint replacement w/o MCC',
  '061 — Ischemic stroke w use of thrombolytic w MCC','064 — Intracranial hemorrhage or cerebral infarction w MCC','066 — Intracranial hemorrhage or cerebral infarction w/o CC/MCC',
  '637 — Diabetes w MCC','638 — Diabetes w CC','639 — Diabetes w/o CC/MCC',
  '682 — Renal failure w MCC','683 — Renal failure w CC','684 — Renal failure w/o CC/MCC',
];

// ---- Parse a record string into tabbed sections ---------------------------
// Records store sections as ALL-CAPS headings ending in ":". We split on those
// and group them into student-facing tabs. Reads existing charts unchanged.
// Top-level headings that legitimately start a new chart section. Anything else
// that looks like "WORD:" — ENT:, HEENT:, Lungs:, Vitals: — is a clinical
// sub-label INSIDE a section and must not split it off.
const TOP_HEADINGS = new Set([
  'CHIEF COMPLAINT','HISTORY OF PRESENT ILLNESS','HPI','PAST MEDICAL HISTORY',
  'PAST SURGICAL HISTORY','FAMILY HISTORY','SOCIAL HISTORY','MEDICATIONS',
  'CURRENT MEDICATIONS','ALLERGIES','REVIEW OF SYSTEMS','ROS','EXAMINATION',
  'PHYSICAL EXAMINATION','EXAM','VITAL SIGNS','LABORATORY','LABORATORY RESULTS',
  'LABS','RADIOLOGY','IMAGING','DIAGNOSTICS','DIAGNOSTIC STUDIES','PATHOLOGY',
  'OPERATIVE NOTE','PROCEDURE','PROCEDURE PERFORMED','PROCEDURES PERFORMED',
  'ASSESSMENT & PLAN','ASSESSMENT AND PLAN','ASSESSMENT','PLAN','DISPOSITION',
  'MEDICAL DECISION MAKING','EXTERNAL CAUSE','IMPRESSION','FINDINGS','TECHNIQUE',
  'CLINICAL INDICATION','COMPARISON','REPORT STATUS','SPECIMEN','CLINICAL HISTORY',
  'GROSS DESCRIPTION','MICROSCOPIC DESCRIPTION','DIAGNOSIS','MEDICATIONS / TREATMENT GIVEN',
  'MEDICATIONS/TREATMENT GIVEN','TREATMENT GIVEN','PRIMARY DIAGNOSIS','PDGM CLINICAL GROUP',
  'HOSPITAL COURSE','DISCHARGE DIAGNOSES','DISCHARGE MEDICATIONS','ANESTHESIA',
  'INDICATIONS','EXAMINATION PERFORMED','HISTORY',
  'HOMEBOUND STATUS','HISTORY / PRESENTING STATUS','VISIT ASSESSMENT',
  'PLAN OF CARE','DIAGNOSTIC RESULTS'
]);

function parseRecordSections(record){
  if(!record) return [];
  const lines = record.split('\n');
  const heading = /^[A-Z][A-Z0-9 \/&()',\-\.\[\]]{2,44}:\s*$/;      // full-line heading
  const inlineHead = /^([A-Z][A-Z0-9 \/&()',\-\.\[\]]{2,44}):\s+(.*)$/; // heading: value on same line
  const secs = [];
  let cur = null;
  const pushLine = (t)=>{ if(!cur){ cur={head:'RECORD', body:[]}; secs.push(cur); } cur.body.push(t); };
  for(const ln of lines){
    const t = ln.trim();
    if(heading.test(t)){
      cur = { head: t.replace(/:\s*$/,''), body: [] }; secs.push(cur);
    } else if(inlineHead.test(t) && TOP_HEADINGS.has(t.match(inlineHead)[1].trim().toUpperCase())){
      const m = t.match(inlineHead);
      cur = { head: m[1], body: [m[2]] }; secs.push(cur);
    } else { pushLine(ln); }
  }
  return secs.map(s=>({ head:s.head, body:s.body.join('\n').replace(/^\n+|\n+$/g,'') }));
}
// Map a raw section heading to a friendly tab. Order defines tab order.
const TAB_MAP = [
  { tab:'Demographics', match:['PATIENT','ACCOUNT','ADMIT','DISCHARGE','ENCOUNTER','FACILITY','MRN','DATE OF SERVICE','PROVIDER','CLINICIAN','REFERRAL','SOC DATE','EPISODE'] },
  { tab:'Chief Complaint', match:['CHIEF COMPLAINT','REASON FOR VISIT','REASON FOR ENCOUNTER'] },
  { tab:'HPI', match:['HISTORY OF PRESENT ILLNESS','HPI','HISTORY / PRESENTING STATUS','PRESENTING STATUS','INDICATIONS','CLINICAL HISTORY','CLINICAL INDICATION'] },
  { tab:'History', match:['PAST MEDICAL HISTORY','PMH','PAST SURGICAL HISTORY','SOCIAL HISTORY','FAMILY HISTORY','ALLERGIES','MEDICATIONS ON ADMISSION','HOME MEDICATIONS','HOMEBOUND STATUS'] },
  { tab:'ROS', match:['REVIEW OF SYSTEMS','ROS'] },
  { tab:'Exam', match:['EXAMINATION','PHYSICAL EXAM','EXAM','VISIT ASSESSMENT','VITALS','VITAL SIGNS','PHYSICAL EXAMINATION'] },
  { tab:'Labs', match:['LABORATORY','LABS','LABORATORY RESULTS','LAB RESULTS','PATHOLOGY RESULTS','BLOOD WORK'] },
  { tab:'Radiology', match:['RADIOLOGY','IMAGING','IMAGING RESULTS','RADIOLOGY REPORT','RADIOLOGY IMPRESSION','DIAGNOSTIC IMAGING'] },
  { tab:'Diagnostics', match:['DIAGNOSTIC RESULTS','DIAGNOSTICS','ECG','EKG','STUDIES','TEST RESULTS','ANCILLARY'] },
  { tab:'Pathology', match:['PATHOLOGY','PATHOLOGY REPORT','GROSS DESCRIPTION','MICROSCOPIC DESCRIPTION','SPECIMEN','SURGICAL PATHOLOGY'] },
  { tab:'Operative Note', match:['OPERATIVE NOTE','OPERATIVE REPORT','PROCEDURE PERFORMED','PROCEDURE NOTE','PROCEDURE IN DETAIL','OPERATION','PREOPERATIVE DIAGNOSIS','POSTOPERATIVE DIAGNOSIS','PROCEDURE(S)','PROCEDURES','ANESTHESIA','SURGEON','FINDINGS','ESTIMATED BLOOD LOSS','SPECIMENS'] },
  { tab:'External Cause', match:['EXTERNAL CAUSE','MECHANISM','MECHANISM OF INJURY','CAUSE / PLACE'] },
  { tab:'Medications', match:['MEDICATIONS / TREATMENT GIVEN','MEDICATIONS','TREATMENT GIVEN','MEDICATIONS GIVEN','TREATMENT','MAR','DRUGS ADMINISTERED'] },
  { tab:'Assessment & Plan', match:['ASSESSMENT & PLAN','ASSESSMENT AND PLAN','ASSESSMENT','PLAN','PLAN OF CARE','IMPRESSION AND PLAN','IMPRESSION','DISPOSITION','PDGM CLINICAL GROUP','OASIS SUMMARY'] },
  { tab:'MDM', match:['MEDICAL DECISION MAKING','MDM','MEDICAL DECISION MAKING (MDM)'] },
];
function groupSectionsIntoTabs(secs){
  const findTab = (head)=>{
    const H = head.toUpperCase();
    for(const t of TAB_MAP){ if(t.match.some(m=> H===m || H.startsWith(m))) return t.tab; }
    return 'Other';
  };
  const order = TAB_MAP.map(t=>t.tab).concat(['Other']);
  const groups = {};
  secs.forEach(s=>{
    if(s.head==='RECORD' && !s.body.trim()) return;
    const tab = s.head==='RECORD' ? 'Demographics' : findTab(s.head);
    (groups[tab] = groups[tab] || []).push(s);
  });
  return order.filter(t=>groups[t]).map(t=>({ tab:t, sections:groups[t] }));
}
function RecordTabs({ chart }){
  const tabs = React.useMemo(()=> groupSectionsIntoTabs(parseRecordSections(chart.record)), [chart.record]);
  const [active, setActive] = useState(0);
  const bodyRef = React.useRef(null);
  React.useEffect(()=>{ setActive(0); if(bodyRef.current) bodyRef.current.scrollTop=0; }, [chart.id]);
  if(!tabs.length){ // fallback: show raw record
    return e('div',{className:'record-body'}, chart.record);
  }
  // Tab 0 = "Full Record" (whole chart). Tabs 1..n = one isolated section each.
  const allTabs = [{ tab:'Full Record', full:true }].concat(tabs);
  const cur = allTabs[Math.min(active, allTabs.length-1)];
  const pick = (i)=>{ setActive(i); if(bodyRef.current) bodyRef.current.scrollTop=0; };
  const renderSections = (sectionList)=> sectionList.map((s,si)=> e('div',{key:si, className:'record-group', style:{marginBottom:14}},
    s.head!=='RECORD'? e('div',{className:'tab-section-title'}, s.head) : null,
    e('div',null, s.body)
  ));
  return e(React.Fragment,null,
    e('div',{className:'chart-tabs'},
      allTabs.map((t,i)=> e('button',{key:i, className:'chart-tab'+(i===active?' active':'')+(t.full?' chart-tab-full':''), onClick:()=>pick(i)},
        t.tab, (!t.full && t.sections.length>1)? e('span',{className:'tdot'}) : null))
    ),
    e('div',{className:'record-body'+(chart.handwritten?' handwritten hw-note':''), ref:bodyRef},
      chart.handwritten? e('div',{className:'hw-banner'},'\u270e Scanned \u2014 handwritten chart (transcribe from the note)') : null,
      cur.full
        ? tabs.map((t,ti)=> e('div',{key:ti},renderSections(t.sections)))   // Full Record: everything
        : renderSections(cur.sections)                                       // isolated: only this section
    )
  );
}
// Pull demographic fields for the blue patient header, from the record if present.
function chartHeaderFields(chart){
  const rec = chart.record||'';
  const grab = (re)=>{ const m=rec.match(re); return m? m[1].trim() : ''; };
  return {
    mrn: grab(/Med Rec Num[:\s]+([A-Z0-9]+)/i) || grab(/MRN[:\s]+([A-Z0-9]+)/i) || ('M'+String(chart.id).replace(/\D/g,'').padStart(6,'0')),
    acct: grab(/Account Num[:\s]+([A-Z0-9]+)/i) || grab(/Account #[:\s]+([A-Z0-9]+)/i) || ('V'+String(chart.id).replace(/\D/g,'').padStart(8,'0')),
    dos: grab(/Date of Service[:\s]+([0-9\-\/]+)/i) || grab(/DOS[:\s]+([0-9\-\/]+)/i) || grab(/SOC Date[:\s]+([0-9\-\/]+)/i) || grab(/Date of surgery[:\s]+([A-Za-z0-9,\s]+)/i) || '',
    provider: grab(/Provider[:\s]+([A-Za-z.,\s]+?)(?:\(|\n)/i) || grab(/Clinician[:\s]+([A-Za-z.,\s]+)/i) || '',
    ptype: grab(/Patient type[:\s]+(New patient|Established patient)/i),
  };
}

// ---- Floating lookup: stays open while the coder works the chart ----
// ---- Floating CODIVIA Code Search -----------------------------------------
// Renders the FULL Code Search page (Alphabetic Index, Tabular List, Neoplasm
// Table, Drugs & Chemicals, External Cause Index, CPT, HCPCS, PCS) in a window
// that floats over the chart, so the coder never loses their place.
// Open the full CODIVIA Code Search in a separate browser window.
// Returns the window handle, or null if the browser blocked the popup.
function openCodeSearchWindow(){
  try{
    const url = window.location.pathname + '?view=findcode';
    const w = Math.min(1100, Math.max(720, (window.screen && window.screen.availWidth || 1200) - 380));
    const h = Math.min(860, Math.max(560, (window.screen && window.screen.availHeight || 900) - 90));
    const left = (window.screen && window.screen.availWidth ? window.screen.availWidth - w - 20 : 40);
    const feat = 'width='+w+',height='+h+',left='+left+',top=40,resizable=yes,scrollbars=yes';
    const win = window.open(url, 'codivia_code_search', feat);
    if(win){ try{ win.focus(); }catch(e){} }
    return win || null;
  }catch(err){ return null; }
}

function FloatingLookup({ codeDB, dbStatus, onInsert, isHH, notice, onClose }){
  const startW = Math.min(880, Math.max(560, (window.innerWidth||1200) - 420));
  const [pos, setPos] = React.useState({
    x: Math.max(12, ((window.innerWidth||1200) - startW) / 2),
    y: 72
  });
  const [size, setSize] = React.useState({ w: startW, h: Math.min(660, (window.innerHeight||800) - 140) });
  const [max, setMax] = React.useState(false);
  const drag = React.useRef(null);
  const rez  = React.useRef(null);

  React.useEffect(()=>{
    const move=(ev)=>{
      if(drag.current){
        setPos({ x: Math.max(4, ev.clientX - drag.current.dx),
                 y: Math.max(4, ev.clientY - drag.current.dy) });
      } else if(rez.current){
        setSize({ w: Math.max(420, rez.current.w + (ev.clientX - rez.current.x)),
                  h: Math.max(320, rez.current.h + (ev.clientY - rez.current.y)) });
      }
    };
    const up=()=>{ drag.current=null; rez.current=null; };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
    return ()=>{ window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); };
  },[]);

  const frame = max
    ? { left:8, top:60, width:'calc(100vw - 16px)', height:'calc(100vh - 76px)' }
    : { left:pos.x, top:pos.y, width:size.w, height:size.h };

  return e('div',{style:Object.assign({position:'fixed', zIndex:9999, background:'#fff',
      border:'1px solid var(--line)', borderRadius:12,
      boxShadow:'0 18px 56px rgba(15,47,86,.34)',
      display:'flex', flexDirection:'column', overflow:'hidden'}, frame)},

    // title bar — drag handle
    e('div',{ onMouseDown:(ev)=>{ if(!max) drag.current={dx:ev.clientX-pos.x, dy:ev.clientY-pos.y}; },
      style:{display:'flex',alignItems:'center',gap:10,padding:'9px 13px',
        cursor: max?'default':'move', background:'#0f2f56', color:'#fff', flexShrink:0}},
      e('span',{style:{fontSize:12,fontWeight:800,letterSpacing:.4,flex:1}},
        '\u2315 CODIVIA CODE SEARCH'),
      onInsert && e('span',{style:{fontSize:10,color:'#bcd4ef'}},
        'click a code in the Tabular to add it to the chart'),
      e('button',{ onClick:()=>setMax(v=>!v), title: max?'Restore':'Maximise',
        style:{background:'none',border:'1px solid rgba(255,255,255,.35)',color:'#fff',
          fontSize:11,cursor:'pointer',borderRadius:5,padding:'2px 8px'}}, max?'\u2921':'\u2922'),
      e('button',{ onClick:onClose, title:'Close',
        style:{background:'none',border:'none',color:'#fff',fontSize:17,cursor:'pointer',
          lineHeight:1,padding:'0 2px'}}, '\u00d7')),

    notice && e('div',{style:{fontSize:11.5,color:'#9a6b12',background:'#fff8ec',
      borderBottom:'1px solid #f0d9a8',padding:'8px 13px',lineHeight:1.5,flexShrink:0}}, notice),
    // the REAL Code Search page, scrolled inside the window
    e('div',{style:{flex:1, overflowY:'auto', overflowX:'hidden', padding:'0 4px'}},
      e(FindACode,{ codeDB, dbStatus, onInsert, isHH, embedded:true })),

    // resize grip
    !max && e('div',{ onMouseDown:(ev)=>{ rez.current={x:ev.clientX,y:ev.clientY,w:size.w,h:size.h}; },
      style:{position:'absolute',right:0,bottom:0,width:18,height:18,cursor:'nwse-resize',
        background:'linear-gradient(135deg, transparent 50%, var(--line) 50%)'}})
  );
}


function Coder({ chart, codeDB, dbStatus, onClose, onSubmit, saveState }){
  const isIP = chart.dept==='IP' || !!chart.isInpatient;
  const isHH = chart.dept==='HH';   // Home Health: ICD-10-CM diagnoses only (PDGM), no E/M or CPT
  // Level of Service (E/M) is only valid where the department actually bills an
  // E/M service. Procedural / technical departments (IVR, RAD, PATH, DME, ENT,
  // GENSURG) code the procedure only — showing an E/M box there teaches students
  // to unbundle. DEPTS[].elements is the source of truth; 'EM' must be listed.
  const deptEls = (DEPTS[chart.dept] && DEPTS[chart.dept].elements) || [];
  const hasEM = deptEls.indexOf('EM') !== -1;
  const [dx, setDx] = useState([{code:'',desc:''}]);      // Principal dx (IP) / Diagnoses (OP)
  const [sdx, setSdx] = useState([{code:'',desc:''}]);    // Secondary diagnoses (IP)
  const [pcs, setPcs] = useState([{code:'',desc:''}]);    // Principal procedure ICD-10-PCS (IP)
  const [spcs, setSpcs] = useState([{code:'',desc:''}]);  // Secondary procedures ICD-10-PCS (IP)
  const [cpt, setCpt] = useState([{code:'',desc:''}]);    // CPT/HCPCS
  const [em, setEm] = useState([{code:'',desc:''}]);      // E/M level of service
  const [drg, setDrg] = useState('');                      // MS-DRG (inpatient only)
  const [lookupOpen, setLookupOpen] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  // Prefer a real browser window. If the browser blocks popups, fall back to
  // the in-page floating panel so the coder is never left with nothing.
  const openLookup = ()=>{
    const win = openCodeSearchWindow();
    if(win){ setPopupBlocked(false); return; }
    setPopupBlocked(true);
    setLookupOpen(true);
  };
  // Insert a code picked in the floating lookup straight into the matching
  // section, so the coder never types the same query twice.
  const insertFromLookup = (row)=>{
    const sys = row[0], code = row[2], desc = row[3];
    const addTo = (rows, setRows)=>{
      const blank = rows.findIndex(r=>!r.code);
      const next = rows.slice();
      if(blank >= 0) next[blank] = Object.assign({}, next[blank], {code, desc});
      else next.push({code, desc});
      setRows(next);
    };
    if(sys === 0){                                   // ICD-10-CM
      if(isIP && dx[0] && dx[0].code) addTo(sdx, setSdx); else addTo(dx, setDx);
    } else if(sys === 1){                            // ICD-10-PCS
      if(isIP && pcs[0] && pcs[0].code) addTo(spcs, setSpcs); else addTo(pcs, setPcs);
    } else if(/^99[2-4]\d\d$/.test(code)){           // E/M level
      addTo(em, setEm);
    } else {                                         // CPT / HCPCS
      addTo(cpt, setCpt);
    }
  };
  const [drgSearch, setDrgSearch] = useState('');
  const [drgOpen, setDrgOpen] = useState(false);
  const [result, setResult] = useState(null);

  const submit = ()=>{
    const norm = s => (s||'').toUpperCase().replace(/[\s.]/g,'');
    const allRows = [...dx, ...sdx, ...pcs, ...spcs, ...em, ...cpt];
    const userCodes = allRows.map(x=>norm(x.code)).filter(Boolean);
    const userMods = allRows.map(x=>norm(x.mod)).filter(Boolean); // modifiers the student attached
    const key = chart.answerKey.map(k=>({code:norm(k.code), desc:k.desc, type:k.type, why:k.why, raw:k.code}));
    // DRG scored specially (IP); PDGM informational; MOD scored against attached modifiers
    const drgKey = key.find(k=>k.type==='DRG');
    const modKey = key.filter(k=>k.type==='MOD');
    const codeKey = key.filter(k=>k.type!=='DRG' && k.type!=='PDGM' && k.type!=='MOD');
    const correctCodes = codeKey.filter(k=>userCodes.includes(k.code));
    const correctMods = modKey.filter(k=>userMods.includes(k.code));
    const correct = [...correctCodes, ...correctMods];
    const missed = [...codeKey.filter(k=>!userCodes.includes(k.code)), ...modKey.filter(k=>!userMods.includes(k.code))];
    // For each wrong entry, pair it with the audited code of the SAME TYPE that
    // the student missed — so the report can say "you coded X, the audited code is Y, because...".
    const missedCodes = codeKey.filter(k=>!userCodes.includes(k.code));
    const usedSubs = {};
    const wrong = allRows.filter(x=>x.code && !codeKey.find(k=>k.code===norm(x.code))).map(x=>{
      const uc = norm(x.code);
      const sameFamily = (a,b)=>{
        if(/^99[2-4]/.test(a) && /^99[2-4]/.test(b)) return true;      // E/M level
        if(/^[0-9]/.test(a) && /^[0-9]/.test(b)) return a.slice(0,3)===b.slice(0,3); // CPT family
        return a.charAt(0)===b.charAt(0);                              // same ICD chapter letter
      };
      let sub = missedCodes.find(k=>!usedSubs[k.code] && sameFamily(uc, k.code));
      if(!sub) sub = missedCodes.find(k=>!usedSubs[k.code]);
      if(sub) usedSubs[sub.code]=true;
      return Object.assign({}, x, sub? {correctedTo:{code:sub.raw||sub.code, desc:sub.desc, why:sub.why}} : {});
    });
    let drgOk = null;
    if(drgKey){
      const userDrgNum = (drg||'').split(' — ')[0].trim();
      drgOk = userDrgNum === drgKey.code;
    }
    const totalItems = codeKey.length + modKey.length + (drgKey?1:0);
    const gotItems = correct.length + (drgOk?1:0);
    const accuracy = totalItems ? Math.round((gotItems/totalItems)*100) : 0;
    const pdgmKey = key.find(k=>k.type==='PDGM');
    const res = { accuracy, correct, missed, wrong, total:totalItems, drgKey, drgOk, userDrg:drg, pdgmKey };
    setResult(res);
    // Persist IMMEDIATELY on scoring. Previously the save only ran from
    // "Save & Continue"; a student who read the score and hit "Back to queue"
    // (or Esc, or browser-back) lost the chart silently.
    onSubmit(res);
  };
  // The modal buttons only dismiss now — the score is already saved.
  const confirmAndClose = ()=>{ onClose(); };

  const drgResults = drgSearch.trim().length>=1
    ? DRG_OPTIONS.filter(o=>o.toLowerCase().includes(drgSearch.toLowerCase().trim())).slice(0,12)
    : DRG_OPTIONS.slice(0,12);

  return e('div',null,
    e('div',{className:'coder'},
      // record pane
      e('div',{className:'record-pane'},
        (function(){ const hf=chartHeaderFields(chart); return e('div',{className:'pt-header'},
          e('div',{className:'pt-name'},
            e('span',null, chart.patient.name),
            e('button',{className:'btn', style:{padding:'4px 11px',fontSize:11.5,color:'#fff',
              background:'rgba(255,255,255,.14)', border:'1px solid rgba(255,255,255,.45)',
              cursor:'pointer', whiteSpace:'nowrap'}, onClick:onClose},'\u2190 Back to queue')
          ),
          e('span',{className:'pt-field'}, chart.patient.sex+' · '+chart.patient.age+'y'+(isIP?' · INPATIENT':'')),
          hf.ptype? e('span',{style:{fontSize:10,fontWeight:800,letterSpacing:.3,
            padding:'2px 8px',borderRadius:4,whiteSpace:'nowrap',
            color: hf.ptype.toLowerCase().indexOf('new')===0 ? '#0f2f56' : '#fff',
            background: hf.ptype.toLowerCase().indexOf('new')===0 ? '#7DD3C0' : 'rgba(255,255,255,.18)',
            border:'1px solid rgba(255,255,255,.35)'}},
            hf.ptype.toLowerCase().indexOf('new')===0 ? 'NEW PATIENT' : 'ESTABLISHED') : null,
          e('span',{className:'pt-field'}, 'MRN', e('b',null, hf.mrn)),
          e('span',{className:'pt-field'}, 'Acct', e('b',null, hf.acct)),
          hf.dos? e('span',{className:'pt-field'}, 'DOS', e('b',null, hf.dos)) : null,
          e('span',{className:'pt-field'}, 'Dept', e('b',null, chart.deptName||chart.dept))
        ); })(),
        e(RecordTabs,{ chart })
      ),
      // code pane
      e('div',{className:'code-pane'},
        e('div',{className:'pane-h'},
          e('span',null, isIP?'Inpatient Coding':'Live Coding'),
          e('div',{style:{display:'flex',alignItems:'center',gap:10}},
            e('button',{ onClick:openLookup,
              title:'Open the full CODIVIA Code Search in a separate window',
              style:{fontSize:11,fontWeight:800,padding:'4px 11px',borderRadius:7,cursor:'pointer',
                letterSpacing:.3, textTransform:'none',
                border:'1px solid '+(lookupOpen?'var(--teal)':'var(--line)'),
                background: lookupOpen?'var(--teal)':'#fff',
                color: lookupOpen?'#fff':'var(--teal-d)'}},
              '\u2315 CODIVIA Code Search'),
            e('span',{style:{fontSize:10,color: dbStatus==='ready'?'var(--ok)':'var(--mod)'}},
              dbStatus==='ready' ? '\u25cf 171,568 codes loaded' : dbStatus==='loading' ? '\u25cc loading codes\u2026' : '\u25cb code DB'))
        ),
        e('div',{className:'code-body'},
          isIP
            ? e(React.Fragment,null,
                e(CodeSection,{ title:'Principal Diagnosis (ICD-10-CM)', sub:'The condition chiefly responsible for admission — drives the DRG. Assign POA.', rows:dx, setRows:setDx, codeDB, filterSys:[0], poa:true }),
                e(CodeSection,{ title:'Secondary Diagnoses (ICD-10-CM)', sub:'Comorbidities & complications (CC/MCC). Assign POA to each.', rows:sdx, setRows:setSdx, codeDB, filterSys:[0], poa:true }),
                e(CodeSection,{ title:'Principal Procedure (ICD-10-PCS)', sub:'The procedure most related to the principal dx — 7-character code.', rows:pcs, setRows:setPcs, codeDB, filterSys:[1] }),
                e(CodeSection,{ title:'Secondary Procedures (ICD-10-PCS)', sub:'Additional significant procedures performed this stay.', rows:spcs, setRows:setSpcs, codeDB, filterSys:[1] }),
                // DRG picker
                e('div',{className:'codesec'},
                  e('div',{className:'lbl'}, 'MS-DRG', e('span',{className:'sub'},'Determine the DRG from dx + procedures + severity')),
                  drg
                    ? e('div',{className:'selcode'},
                        e('span',{className:'c'}, drg.split(' — ')[0]),
                        e('span',{className:'d'}, drg.split(' — ').slice(1).join(' — ')),
                        e('button',{className:'rm', onClick:()=>{setDrg('');setDrgSearch('');}},'×'))
                    : e('div',{className:'searchbox'},
                        e('input',{value:drgSearch, placeholder:'Search DRG number or title…',
                          onChange:ev=>{setDrgSearch(ev.target.value);setDrgOpen(true);},
                          onFocus:()=>setDrgOpen(true), onBlur:()=>setTimeout(()=>setDrgOpen(false),180)}),
                        drgOpen && e('div',{className:'dropdown'},
                          drgResults.map((o,i)=>
                            e('div',{className:'dropitem', key:i, onMouseDown:()=>{setDrg(o);setDrgOpen(false);}},
                              e('span',{className:'dc'}, o.split(' — ')[0]),
                              e('span',{className:'sys'},'DRG'),
                              e('span',{className:'dd'}, o.split(' — ').slice(1).join(' — ')))
                          ))
                      )
                )
              )
            : e(React.Fragment,null,
                e(CodeSection,{ title:'Diagnoses (ICD-10-CM)', sub: isHH?'Primary diagnosis drives the PDGM clinical group — code the focus of care first':'Type a condition — e.g. "pain", "diabetes"', rows:dx, setRows:setDx, codeDB, filterSys:[0], onLookup:openLookup }),
                hasEM && e(CodeSection,{ title:'Level of Service (E/M)', sub:'Assign the E/M level — e.g. 99213, 99214, 99283', rows:em, setRows:setEm, codeDB, filterSys:[2], mods:true, onLookup:openLookup }),
                !isHH && e(CodeSection,{ title:'CPT / HCPCS', sub:'Procedures, drugs & supplies · add a modifier after picking a code', rows:cpt, setRows:setCpt, codeDB, filterSys:[2,3], mods:true, onLookup:openLookup }),
              )
        ),
        e('div',{className:'submitbar', style:{display:'flex',gap:8}},
          e('button',{ onClick:openLookup, title:'Open the full CODIVIA Code Search in a separate window',
            style:{flex:'0 0 auto',padding:'0 16px',borderRadius:8,cursor:'pointer',fontSize:12.5,fontWeight:800,
              border:'1px solid var(--line)', background: lookupOpen?'#eefaf8':'#fff',
              color: lookupOpen?'var(--teal-d)':'var(--ink)'}},
            '\u2315 Code Search'),
          e('button',{className:'submitbtn', style:{flex:1}, onClick:submit}, 'Submit for Scoring')
        )
      )
    ),
    lookupOpen && e(FloatingLookup,{ codeDB, dbStatus, onInsert:insertFromLookup, isHH,
      notice: popupBlocked? 'Your browser blocked the pop-up window, so Code Search opened here instead. Allow pop-ups for this site to use a separate window.' : '',
      onClose:()=>setLookupOpen(false) }),
    result && e(ResultModal,{ result, chart, saveState, onRedo:()=>setResult(null), onClose:confirmAndClose })
  );
}

function CodeSection({ title, sub, rows, setRows, codeDB, filterSys, mods, poa, onLookup }){
  const upd = (i, code, desc)=>{ const n=[...rows]; n[i]={...n[i],code,desc}; setRows(n); };
  const setMod = (i, mod)=>{ const n=[...rows]; n[i]={...n[i],mod}; setRows(n); };
  const setPoa = (i, p)=>{ const n=[...rows]; n[i]={...n[i],poa:p}; setRows(n); };
  const add = ()=> setRows([...rows, {code:'',desc:''}]);
  const rm = (i)=> setRows(rows.filter((_,j)=>j!==i));

  return e('div',{className:'codesec'},
    e('div',{className:'lbl'}, title, e('span',{className:'sub'}, sub),
      onLookup && e('button',{ onClick:onLookup, title:'Open the floating code lookup',
        style:{marginLeft:'auto',fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:5,
          cursor:'pointer',border:'1px solid var(--line)',background:'#fff',
          color:'var(--teal-d)',whiteSpace:'nowrap',textTransform:'none',letterSpacing:0}},
        '\u2315 lookup')),
    rows.map((row,i)=>
      row.code
        ? e('div',{className:'selcode', key:i},
            e('span',{className:'c'}, row.code + (row.mod?'-'+row.mod:'')),
            e('span',{className:'d'}, row.desc),
            poa ? e('select',{
                className:'poasel',
                value:row.poa||'',
                onChange:ev=>setPoa(i, ev.target.value)
              },
              e('option',{value:''},'POA?'),
              POA_OPTIONS.map((p,k)=>e('option',{key:k, value:p[0], title:p[1]}, p[1]))
            ) : null,
            mods ? e('select',{
                className:'modsel',
                value:row.mod||'',
                onChange:ev=>setMod(i, ev.target.value)
              },
              e('option',{value:''},'+ Modifier'),
              MODIFIERS.map((m,k)=>e('option',{key:k, value:m[0], title:m[1]}, m[0]+' — '+m[1]))
            ) : null,
            e('button',{className:'rm', onClick:()=>{ rows.length>1 ? rm(i) : upd(i,'',''); }}, '×')
          )
        : e('div',{className:'codeline', key:i},
            e('span',{className:'num'}, (i+1)+'.'),
            e(CodeSearch,{ codeDB, filterSys, onPick:(code,desc)=>upd(i,code,desc) })
          )
    ),
    e('button',{className:'addbtn', onClick:add}, '+ Add code')
  );
}

function CodeSearch({ codeDB, filterSys, onPick }){
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(()=>{
    if(!codeDB || q.trim().length<2) return [];
    const ql = q.toLowerCase().trim();
    const isCodeish = /^[a-z0-9]{1,7}\.?[a-z0-9]*$/i.test(q.trim()) && /\d/.test(q);
    const qcode = ql.replace('.','');
    const scored=[];
    const terms = ql.split(/\s+/).filter(Boolean);        // multi-word: all terms must appear
    const multi = terms.length > 1;
    for(let idx=0; idx<codeDB.length; idx++){
      const row = codeDB[idx]; // [sysInt, code, disp, desc, billable]
      if(filterSys && !filterSys.includes(row[0])) continue;
      const codeRaw = row[1].toLowerCase();
      const disp = row[2].toLowerCase();
      const desc = row[3].toLowerCase();
      const codeMatch = codeRaw.startsWith(qcode) || disp.startsWith(ql);
      let score;
      if(multi){
        // every term must be present somewhere in the description
        if(!terms.every(t=>desc.indexOf(t)!==-1)) { if(!codeMatch) continue; }
        // score by earliest term position + count of word-boundary hits
        let wbHits=0, firstPos=999;
        terms.forEach(t=>{ const p=desc.indexOf(t); if(p<firstPos&&p!==-1)firstPos=p;
          if(new RegExp('(^|[^a-z])'+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(desc)) wbHits++; });
        score = codeMatch ? 1 : (2 + (terms.length - wbHits) + Math.min(firstPos,200)/1000);
      } else {
        const descPos = desc.indexOf(ql);
        if(!codeMatch && descPos===-1) continue;
        if(disp === ql || codeRaw === qcode) score = 0;
        else if(codeMatch) score = 1;
        else if(descPos === 0) score = 2;
        else if(/(^|[^a-z])$/.test(desc.slice(0,descPos))) score = 3;
        else score = 5 + Math.min(descPos, 200)/1000;
      }
      // demote procedural-complication codes
      if(/during (a |other |an )?procedure|accidental (puncture|laceration)|complication|intraoperative|postprocedural|iatrogenic|sequela/.test(desc)) score += 3;
      if(/\bunspecified\b/.test(desc)) score += 0.3;
      if(row[4]===1 || row[4]==='1') score -= 0.2;
      scored.push([score, desc.length, row]);
    }
    scored.sort((a,b)=> a[0]-b[0] || a[1]-b[1]);
    return scored.slice(0,50).map(s=>s[2]);
  },[q, codeDB, filterSys]);

  return e('div',{className:'searchbox'},
    e('input',{
      value:q, placeholder:'Search code or description…',
      onChange:ev=>{ setQ(ev.target.value); setOpen(true); },
      onFocus:()=>setOpen(true),
      onBlur:()=>setTimeout(()=>setOpen(false),180)
    }),
    open && q.trim().length>=2 && e('div',{className:'dropdown'},
      results.length===0
        ? e('div',{className:'dropempty'}, codeDB ? 'No matches — try another term' : 'Loading code database…')
        : results.map((row,i)=>
            e('div',{className:'dropitem', key:i, onMouseDown:()=>onPick(row[2], row[3])},
              e('span',{className:'dc'}, row[2]),
              e('span',{className:'sys'}, SYS_SHORT[row[0]]),
              e('span',{className:'dd'}, row[3])
            )
          )
    )
  );
}

function ResultModal({ result, chart, onRedo, onClose, saveState }){
  const cls = result.accuracy>=90?'hi':result.accuracy>=75?'mid':'lo';
  return e('div',{className:'result-overlay'},
    e('div',{className:'result-card'},
      e('div',{className:'result-h'},
        e('div',{className:'score '+cls}, result.accuracy+'%'),
        e('div',{className:'lbl'}, result.correct.length+' of '+result.total+' codes correct')
      ),
      e('div',{className:'result-b'},
        result.pdgmKey && e(React.Fragment,null,
          e('h4',null,'PDGM Clinical Group'),
          e('div',{className:'rescode ok'},
            e('span',{className:'c', style:{minWidth:'auto',padding:'2px 8px'}}, '🏠'),
            e('span',null, result.pdgmKey.code+' — this primary diagnosis maps to the above PDGM clinical grouping for the 30-day episode.'))
        ),
        result.drgKey && e(React.Fragment,null,
          e('h4',null,'MS-DRG'),
          e('div',{className:'rescode '+(result.drgOk?'ok':'miss')},
            e('span',{className:'c'}, result.drgKey.code),
            e('span',null, result.drgOk
              ? '✓ '+result.drgKey.desc
              : '✗ Correct DRG: '+result.drgKey.code+' — '+result.drgKey.desc+(result.userDrg?' (you chose '+result.userDrg.split(' — ')[0]+')':' (none selected)')))
        ),
        result.correct.length>0 && e(React.Fragment,null,
          e('h4',null,'\u2713 Correct codes'),
          result.correct.map((k,i)=>e('div',{key:i},
            e('div',{className:'rescode ok'}, e('span',{className:'c'},k.code), e('span',null,k.desc)),
            k.why && e('div',{style:{fontSize:11.5,color:'var(--muted)',lineHeight:1.6,
              margin:'-2px 0 10px 0',padding:'7px 11px',background:'#f6faf9',
              borderLeft:'3px solid var(--ok)',borderRadius:'0 6px 6px 0'}},
              e('b',{style:{color:'var(--ok)'}},'Why: '), k.why)))
        ),
        result.missed.length>0 && e(React.Fragment,null,
          e('h4',null,'\u2717 Missed \u2014 should have been coded'),
          result.missed.map((k,i)=>e('div',{key:i},
            e('div',{className:'rescode miss'}, e('span',{className:'c'},k.code), e('span',null,k.desc)),
            k.why && e('div',{style:{fontSize:11.5,color:'var(--ink)',lineHeight:1.6,
              margin:'-2px 0 10px 0',padding:'7px 11px',background:'#fdf4f4',
              borderLeft:'3px solid #B4232A',borderRadius:'0 6px 6px 0'}},
              e('b',{style:{color:'#B4232A'}},'Why this code: '), k.why)))
        ),
        result.wrong.length>0 && e(React.Fragment,null,
          e('h4',null,'? Not in answer key'),
          result.wrong.map((k,i)=>{
            const sub = k.correctedTo;
            return e('div',{key:i},
              e('div',{className:'rescode wrong'}, e('span',{className:'c'},k.code||'(blank)'), e('span',null,k.desc||'')),
              sub && e('div',{style:{fontSize:11.5,color:'var(--ink)',lineHeight:1.6,
                margin:'-2px 0 10px 0',padding:'8px 11px',background:'#fff8ec',
                borderLeft:'3px solid var(--mod)',borderRadius:'0 6px 6px 0'}},
                e('div',{style:{marginBottom:4}},
                  e('b',{style:{color:'#9a6b12'}}, 'You coded '+k.code+' \u2014 the audited code is '+sub.code+'.')),
                e('div',null, sub.why || sub.desc)));
          })
        )
      ),
      e('div',{className:'result-actions', style:{alignItems:'center'}},
        saveState==='error'
          ? e('span',{style:{marginRight:'auto',fontSize:12,fontWeight:800,color:'#B4232A'}},
              'Not saved \u2014 check your connection and submit again.')
          : e('span',{style:{marginRight:'auto',fontSize:12,fontWeight:800,color:'#0E7C66'}},
              saveState==='saving' ? 'Saving\u2026' : 'Result saved \u2713'),
        e('button',{style:{background:'#fff',border:'1px solid var(--line)',color:'var(--ink)'}, onClick:onRedo},'Try Again'),
        e('button',{style:{background:'var(--teal)',color:'#fff'}, onClick:onClose},'Continue')
      )
    )
  );
}

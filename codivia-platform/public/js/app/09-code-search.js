/* CODIVIA platform — code search, drug reference, Find-a-Code */
// ---- Certificate view ----
window.ICD_INDEX=null;
window.ICD_EINDEX=null;
window.ICD_NOTES=null;
window.ICD_NEO=null;
window.ICD_DRUG=null;
// ---- CODIVIA Code Search: codebook-style lookup (term → matches → full code detail) ----
// A CPT add-on code carries the official parenthetical marker in its descriptor.
function isAddOn(row){
  return row && row[0]===2 && /List separately in addition to code for primary procedure/i.test(row[3]||'');
}
// ICD-10-CM external cause of morbidity chapter (V00-Y99).
function isExtCause(row){
  return row && row[0]===0 && /^[VWXY]/.test(row[2]||'');
}
// ---- Drug Reference: substance -> how it is coded ------------------------
// Built from the CMS Table of Drugs and Chemicals plus HCPCS J codes.
// It answers the questions a coder actually has: is an adverse effect even
// possible for this substance, which poisoning column applies, and is there
// a HCPCS code for administering it.
function DrugReference({ codeDB, dbStatus }){
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(null);
  const [TBL, setTBL] = React.useState(window.ICD_DRUG || null);
  const [NDC, setNDC] = React.useState(window.FDA_NDC || null);

  React.useEffect(()=>{
    if(window.ICD_DRUG){ setTBL(window.ICD_DRUG); return; }
    let live=true;
    loadB64Json('ICD_DRUG_B64','ICD_DRUG').then(d=>{ if(live) setTBL(d); }).catch(()=>{});
    loadFdaNdc().then(d=>{ if(live && d) setNDC(d); }).catch(()=>{});
    return ()=>{ live=false; };
  },[]);

  // Legal status for the selected substance, from the FDA NDC directory.
  // Returns null when the dataset is not loaded — we never guess.
  const legalStatus = React.useMemo(()=>{
    if(!NDC || !sel) return null;
    const name = sel.t.split('(')[0].trim().toLowerCase();
    if(name.length<4) return null;
    const hit = NDC[name] || NDC[name.replace(/[^a-z]/g,'')];
    return hit || null;
  },[NDC, sel]);

  const ql = q.trim().toLowerCase();
  const rows = React.useMemo(()=>{
    if(!TBL || ql.length<2) return [];
    // exact name first, then prefix, then contains. Duplicate names are collapsed
    // so the same substance is not listed three times.
    const exact=[], starts=[], contains=[]; const seen={};
    for(let i=0;i<TBL.length;i++){
      const row=TBL[i]; const t=row.t.trim().toLowerCase();
      if(seen[t]) continue;
      if(t===ql){ seen[t]=1; exact.push(row); }
      else if(t.indexOf(ql)===0){ seen[t]=1; starts.push(row); }
      else if(t.indexOf(ql)!==-1){ seen[t]=1; contains.push(row); }
    }
    return exact.concat(starts, contains).slice(0,120);
  },[TBL, ql]);

  // HCPCS J codes matching the substance name
  const jcodes = React.useMemo(()=>{
    if(!codeDB || !sel) return [];
    const name = sel.t.split('(')[0].trim().toLowerCase();
    if(name.length<4) return [];
    const out=[];
    for(let i=0;i<codeDB.length;i++){
      const r=codeDB[i];
      if(r[0]!==3) continue;
      if(r[2].charAt(0)!=='J') continue;          // drug products only, not G/A service codes
      if(r[3].toLowerCase().indexOf(name)!==-1) out.push(r);
      if(out.length>=12) break;
    }
    return out;
  },[codeDB, sel]);

  const COLS = [
    {k:'Poisoning, accidental',   i:0, c:'#B4232A'},
    {k:'Poisoning, self-harm',    i:1, c:'#8B2E6B'},
    {k:'Poisoning, assault',      i:2, c:'#C4562A'},
    {k:'Poisoning, undetermined', i:3, c:'#7A6A2E'},
    {k:'Adverse effect',          i:4, c:'#0E7C66'},
    {k:'Underdosing',             i:5, c:'#5A6472'}
  ];

  const detail = ()=>{
    if(!sel) return null;
    const therapeutic = !!sel.c[4];
    return e('div',{style:{background:'#fff',border:'2px solid var(--teal)',borderRadius:12,
      padding:'16px 18px',marginBottom:14}},
      e('div',{style:{fontSize:17,fontWeight:900,color:'var(--navy)',marginBottom:8}}, sel.t),

      e('div',{style:{background: therapeutic?'#eefaf8':'#fdeeee',
        border:'1px solid '+(therapeutic?'#bfe6dd':'#f3c9c9'),
        borderRadius:8,padding:'10px 13px',marginBottom:12,fontSize:12.5,lineHeight:1.6}},
        therapeutic
          ? e('span',null, e('b',null,'Has a therapeutic use. '),
              'An ',e('b',null,'adverse effect'),' code is available for this substance \u2014 use it when the drug was correctly prescribed and correctly taken. If it was taken incorrectly, overdosed, or combined with alcohol, that is a ',
              e('b',null,'poisoning'),' instead.')
          : e('span',null, e('b',null,'No therapeutic use recorded. '),
              'The Table gives no adverse-effect column for this substance, so an adverse effect code does not apply. Code it as a poisoning or toxic effect according to intent.')),

      (function(){
        // Drug class derived from the substance's own poisoning code. This is a
        // property of the ICD classification, not a clinical inference.
        const CLS = {'T40.0':'Opium','T40.1':'Heroin','T40.2':'Opioid analgesic',
          'T40.3':'Methadone','T40.4':'Synthetic narcotic','T40.5':'Cocaine',
          'T40.6':'Narcotic','T40.7':'Cannabis','T42.4':'Benzodiazepine',
          'T43.6':'Psychostimulant'};
        const p0 = (sel.c[0]||'').slice(0,5);
        const label = CLS[p0];
        if(!label) return null;
        return e('div',{style:{marginBottom:12}},
          e('div',{style:{fontSize:11,fontWeight:800,color:'var(--muted)',letterSpacing:.5,marginBottom:7}},
            'DRUG CLASS'),
          e('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',
            padding:'10px 13px',borderRadius:8,background:'#fff8ec',border:'1px solid #f0d9a8'}},
            e('span',{style:{fontSize:11,fontWeight:800,color:'#fff',background:'#9a6b12',
              borderRadius:5,padding:'3px 10px',whiteSpace:'nowrap'}}, label.toUpperCase()),
            e('span',{style:{fontSize:11.5,color:'var(--ink)',lineHeight:1.55,flex:1}},
              'Classified here by its poisoning code prefix ', 
              e('b',{style:{fontFamily:"'SF Mono',monospace"}}, p0),
              '. Substances in this group are commonly controlled \u2014 check the documented intent carefully, since accidental, self-harm, assault and undetermined each take a different code.')));
      })(),
      e('div',{style:{fontSize:11,fontWeight:800,color:'var(--muted)',letterSpacing:.5,marginBottom:7}},
        'LEGAL STATUS \u2014 PRESCRIPTION OR OTC'),
      legalStatus
        ? e('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:12,
            padding:'10px 13px',borderRadius:8,
            background: legalStatus.rx ? '#f5f1fc' : '#eefaf8',
            border:'1px solid '+(legalStatus.rx ? '#ded2f2' : '#bfe6dd')}},
            e('span',{style:{fontSize:11,fontWeight:800,color:'#fff',borderRadius:5,padding:'3px 10px',
              background: legalStatus.rx ? '#7A5AB8' : '#0E7C66'}},
              legalStatus.rx ? '\u211e PRESCRIPTION' : 'OTC \u2014 OVER THE COUNTER'),
            e('span',{style:{fontSize:12,color:'var(--ink)'}}, legalStatus.category||''),
            legalStatus.rx
              ? e('span',{style:{fontSize:11.5,color:'var(--muted)'}},
                  'A prescription drug taken as directed can produce an adverse effect; taken incorrectly it is a poisoning.')
              : e('span',{style:{fontSize:11.5,color:'var(--muted)'}},
                  'Available without a prescription \u2014 patients frequently self-medicate, so check the documented dose against label directions.'))
        : (jcodes.length>0
            ? e('div',{style:{marginBottom:12,padding:'10px 13px',borderRadius:8,background:'#f5f1fc',
                border:'1px solid #ded2f2',fontSize:12,color:'var(--ink)',lineHeight:1.6}},
                e('span',{style:{fontSize:11,fontWeight:800,color:'#fff',background:'#7A5AB8',
                  borderRadius:5,padding:'3px 10px',marginRight:8}}, 'PROVIDER-ADMINISTERED'),
                'An injectable or infused form of this substance exists and carries a HCPCS J code, so that form is supplied and administered by a provider. Report the J code with the administration CPT code. ',
                e('b',null,'Other forms of the same drug may be oral or over the counter '),
                '\u2014 code from the route and dose actually documented, not from the substance name.')
            : e('div',{style:{marginBottom:12,padding:'10px 13px',borderRadius:8,background:'#f4f6f8',
                border:'1px solid #dfe4ea',fontSize:12,color:'var(--ink)',lineHeight:1.6}},
                e('b',null,'Not determinable from coding data. '),
                'Neither the Table of Drugs nor HCPCS records whether this substance is prescription-only or sold over the counter, and CODIVIA will not guess \u2014 that is a clinical fact. ',
                e('b',null,'What matters for your code is not the legal status but the documentation: '),
                'if the drug was correctly prescribed and correctly taken, code the adverse effect; if it was taken incorrectly, overdosed, or combined with alcohol, code the poisoning. An OTC drug taken beyond label directions is still a poisoning.')),

      e('div',{style:{fontSize:11,fontWeight:800,color:'var(--muted)',letterSpacing:.5,marginBottom:7}},
        'TABLE OF DRUGS AND CHEMICALS'),
      e('div',{style:{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}},
        COLS.map((col,ci)=>{
          const v=sel.c[col.i];
          if(!v) return e('span',{key:ci, style:{fontSize:10.5,color:'#c3c8cf',
            border:'1px dashed var(--line)',borderRadius:5,padding:'4px 9px'}}, col.k+': \u2014');
          return e('span',{key:ci, style:{fontSize:10.5,fontWeight:700,borderRadius:5,padding:'4px 9px',
            border:'1px solid '+col.c, color:col.c, background:'#fff'}},
            col.k+': ', e('span',{style:{fontFamily:"'SF Mono',monospace",fontWeight:800}}, v));
        })),

      jcodes.length>0 && e('div',null,
        e('div',{style:{fontSize:11,fontWeight:800,color:'var(--muted)',letterSpacing:.5,marginBottom:7}},
          'HCPCS J CODES \u2014 for the drug product when administered'),
        e('div',{style:{maxHeight:180,overflowY:'auto',border:'1px solid var(--line)',borderRadius:8}},
          jcodes.map((r,i)=> e('div',{key:i, style:{display:'flex',gap:10,padding:'7px 11px',
            borderBottom: i<jcodes.length-1?'1px solid var(--line-soft)':'none'}},
            e('span',{style:{fontSize:12,fontWeight:800,color:'var(--navy)',
              fontFamily:"'SF Mono',monospace",minWidth:62}}, r[2]),
            e('span',{style:{fontSize:11.5,color:'var(--ink)',flex:1,lineHeight:1.4}}, r[3])))),
        e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:7,lineHeight:1.55}},
          'Read the descriptor for the ',e('b',null,'unit'),' \u2014 per mg, per 10 mg or per vial \u2014 and calculate units from the dose documented, not the vial size. Report the administration CPT code as well.')),

      e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:12,lineHeight:1.55,
        borderTop:'1px solid var(--line-soft)',paddingTop:10}},
        'Sequencing reminder: for a ',e('b',null,'poisoning'),', the poisoning code comes first, then the manifestation. For an ',
        e('b',null,'adverse effect'),', the manifestation comes first, then the T code. ',
        e('b',null,'Underdosing'),' is never a principal diagnosis.')
    );
  };

  return e('div',{className:'page'},
    e('div',{className:'page-head'}, e('h1',null,'Drug Reference'),
      e('p',{style:{color:'var(--muted)',margin:'4px 0 0',fontSize:13}},
        'Look up a substance to see how it is coded \u2014 whether an adverse effect applies, which poisoning column fits the documented intent, and the HCPCS code for the product.')),

    e('div',{style:{position:'relative',marginBottom:12}},
      e('input',{ value:q, onChange:ev=>{ setQ(ev.target.value); setSel(null); },
        placeholder: TBL? 'Search a drug or chemical \u2014 e.g. acetaminophen, insulin, warfarin\u2026' : 'Loading drug table\u2026',
        style:{width:'100%',padding:'12px 15px',fontSize:14.5,border:'1px solid var(--line)',
          borderRadius:10,outline:'none',boxSizing:'border-box'} }),
      e('span',{style:{position:'absolute',right:14,top:13,fontSize:11,color: TBL?'var(--ok)':'var(--mod)'}},
        TBL? TBL.length.toLocaleString()+' substances' : 'loading\u2026')),

    detail(),

    e('div',{style:{background:'#fff',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden'}},
      ql.length<2
        ? e('div',{style:{padding:'34px 20px',textAlign:'center',color:'var(--muted)',fontSize:13.5}},
            'Type at least two characters to search the Table of Drugs and Chemicals.')
        : rows.length===0
          ? e('div',{style:{padding:'34px 20px',textAlign:'center',color:'var(--muted)',fontSize:13.5}},
              'No substance matches that term.')
          : e('div',{style:{maxHeight:460,overflowY:'auto'}},
              rows.map((r,i)=> e('div',{key:i, onClick:()=>setSel(r),
                style:{display:'flex',alignItems:'center',gap:11,padding:'10px 15px',cursor:'pointer',
                  borderBottom: i<rows.length-1?'1px solid var(--line-soft)':'none',
                  background: sel&&sel===r?'#eef4fb':'#fff'}},
                e('span',{style:{fontSize:13,color:'var(--ink)',flex:1,
                  paddingLeft: Math.min(r.l,4)*12}}, r.t),
                r.c[4]
                  ? e('span',{style:{fontSize:9.5,fontWeight:800,color:'#0E7C66',background:'#eefaf8',
                      border:'1px solid #bfe6dd',borderRadius:4,padding:'2px 7px',whiteSpace:'nowrap'}}, 'THERAPEUTIC')
                  : e('span',{style:{fontSize:9.5,fontWeight:800,color:'#B4232A',background:'#fdeeee',
                      border:'1px solid #f3c9c9',borderRadius:4,padding:'2px 7px',whiteSpace:'nowrap'}}, 'NO ADVERSE EFFECT'),
                e('span',{style:{fontSize:11,fontFamily:"'SF Mono',monospace",color:'var(--muted)',minWidth:64}},
                  r.c[0]||'\u2014'))))),

    e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:12,lineHeight:1.6}},
      'Source: official CMS ICD-10-CM Table of Drugs and Chemicals FY2026 and the HCPCS Level II code set. This is a ',
      e('b',null,'coding'),' reference. It does not carry dosing, interactions or contraindications, and is not a clinical drug database. Prescription/OTC status requires the free FDA National Drug Code directory \u2014 upload ',
      e('b',null,'ndctext.zip'),' from accessdata.fda.gov and it will appear against every substance.')
  );
}

function FindACode({ codeDB, dbStatus, onInsert, isHH, embedded }){
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [copied, setCopied] = React.useState(false);
  const [added, setAdded] = React.useState('');
  const [sysFilter, setSysFilter] = React.useState('all'); // all | icd | pcs | cpt
  const [mode, setMode] = React.useState('index'); // index | tabular
  const [iq, setIq] = React.useState('');          // index main-term filter
  const [trail, setTrail] = React.useState([]);    // drill-down path of nodes
  const [openK, setOpenK] = React.useState({});    // expanded sub-term keys
  const [IDX, setIDX] = React.useState(window.ICD_INDEX || []);
  const [idxLoading, setIdxLoading] = React.useState(!window.ICD_INDEX);
  const [EIDX, setEIDX] = React.useState(window.ICD_EINDEX || []);
  const [NOTES, setNOTES] = React.useState(window.ICD_NOTES || null);
  React.useEffect(()=>{
    if(window.ICD_NOTES){ setNOTES(window.ICD_NOTES); return; }
    let live=true;
    loadIcdNotes().then(d=>{ if(live) setNOTES(d); }).catch(()=>{});
    return ()=>{ live=false; };
  },[]);

  // notes for a code, walking up the hierarchy: J45.21 -> J45.2 -> J45
  const notesFor = React.useCallback((code)=>{
    if(!NOTES || !code) return [];
    const c=String(code).toUpperCase().replace(/-$/,'');
    const cands=[]; 
    cands.push(c);
    if(c.indexOf('.')!==-1){
      const [h,tail]=c.split('.');
      for(let i=tail.length-1;i>=1;i--) cands.push(h+'.'+tail.slice(0,i));
      cands.push(h);
    } else {
      for(let i=c.length-1;i>=3;i--) cands.push(c.slice(0,i));
    }
    const out=[];
    cands.forEach(k=>{ if(NOTES[k]) out.push({code:k, notes:NOTES[k], self:k===c}); });
    return out;
  },[NOTES]);

  const [TBL, setTBL] = React.useState({neo:null, drug:null});
  const [tq, setTq] = React.useState('');
  React.useEffect(()=>{
    if(mode!=='neo' && mode!=='drug') return;
    const key = mode==='neo' ? 'neo' : 'drug';
    if(TBL[key]) return;
    let live=true;
    loadB64Json(key==='neo'?'ICD_NEO_B64':'ICD_DRUG_B64', key==='neo'?'ICD_NEO':'ICD_DRUG')
      .then(d=>{ if(live) setTBL(prev=>Object.assign({}, prev, {[key]:d})); })
      .catch(()=>{});
    return ()=>{ live=false; };
  },[mode, TBL]);

  // ancestor path for a row index (site tables are indented hierarchies)
  const rowPath = React.useCallback((rows, i)=>{
    const out=[]; let lvl=rows[i].l;
    for(let j=i-1;j>=0 && lvl>0;j--){
      if(rows[j].l < lvl){ out.push(rows[j].t); lvl=rows[j].l; }
    }
    return out.reverse();
  },[]);

  const tableRows = React.useMemo(()=>{
    const key = mode==='neo'?'neo':'drug';
    const rows = TBL[key];
    if(!rows) return null;
    const q=tq.trim().toLowerCase();
    if(!q) return rows.slice(0,80).map((r,i)=>({r, i}));
    const starts=[], contains=[];
    for(let i=0;i<rows.length;i++){
      const t=rows[i].t.toLowerCase();
      if(t.indexOf(q)===0) starts.push({r:rows[i], i});
      else if(t.indexOf(q)!==-1) contains.push({r:rows[i], i});
      if(starts.length>=300) break;
    }
    return starts.concat(contains).slice(0,300);
  },[mode, TBL, tq]);

  // hoisted above every memo that reads it (avoids temporal-dead-zone crash)
  const MODE_SYS = { cpt:[2], hcpcs:[3], pcs:[1] };
  const modeCount = React.useMemo(()=>{
    if(!codeDB || !MODE_SYS[mode]) return null;
    const want=MODE_SYS[mode]; let n=0;
    for(let i=0;i<codeDB.length;i++) if(want.indexOf(codeDB[i][0])!==-1) n++;
    return n;
  },[codeDB, mode]);

  const [refNote, setRefNote] = React.useState('');
  React.useEffect(()=>{
    if(window.ICD_INDEX){ setIDX(window.ICD_INDEX); setIdxLoading(false); return; }
    let live=true;
    loadIcdIndex().then(d=>{ if(live){ setIDX(d); setIdxLoading(false); } })
      .catch(()=>{ if(live) setIdxLoading(false); });
    loadIcdEIndex().then(d=>{ if(live) setEIDX(d); }).catch(()=>{});
    return ()=>{ live=false; };
  },[]);
  const SYS = { 0:{name:'ICD-10-CM', short:'ICD-10-CM', color:'#3B82F6'},
                1:{name:'ICD-10-PCS', short:'ICD-10-PCS', color:'#8B5CF6'},
                2:{name:'CPT', short:'CPT', color:'#C4501A'},
                3:{name:'HCPCS Level II', short:'HCPCS', color:'#E5A82E'} };
  const filterSys = MODE_SYS[mode] ? MODE_SYS[mode]
    : (sysFilter==='icd'?[0] : sysFilter==='pcs'?[1] : sysFilter==='cpt'?[2,3]
    : sysFilter==='ext'?[0] : sysFilter==='addon'?[2] : null);

  const results = React.useMemo(()=>{
    if(!codeDB || q.trim().length<2) return [];
    const ql=q.toLowerCase().trim(); const qcode=ql.replace(/\./g,'');
    const terms=ql.split(/\s+/).filter(Boolean); const multi=terms.length>1;
    const scored=[];
    for(let idx=0; idx<codeDB.length; idx++){
      const row=codeDB[idx];
      if(filterSys && !filterSys.includes(row[0])) continue;
      if(sysFilter==='ext'   && !isExtCause(row)) continue;
      if(sysFilter==='addon' && !isAddOn(row))    continue;
      const codeRaw=row[1].toLowerCase(), disp=row[2].toLowerCase(), desc=row[3].toLowerCase();
      const codeMatch=codeRaw.startsWith(qcode)||disp.startsWith(ql);
      let score;
      if(multi){
        if(!terms.every(t=>desc.indexOf(t)!==-1)){ if(!codeMatch) continue; }
        let wb=0, first=999;
        terms.forEach(t=>{ const p=desc.indexOf(t); if(p<first&&p!==-1)first=p;
          if(new RegExp('(^|[^a-z])'+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(desc)) wb++; });
        score = codeMatch?1:(2+(terms.length-wb)+Math.min(first,200)/1000);
      } else {
        const p=desc.indexOf(ql);
        if(!codeMatch && p===-1) continue;
        if(disp===ql||codeRaw===qcode) score=0; else if(codeMatch) score=1; else if(p===0) score=2;
        else if(/(^|[^a-z])$/.test(desc.slice(0,p))) score=3; else score=5+Math.min(p,200)/1000;
      }
      if(/during (a |other |an )?procedure|accidental (puncture|laceration)|complication|intraoperative|postprocedural|iatrogenic/.test(desc)) score+=3;
      // 'sequela' is a normal 7th-character variant on injury and external cause
      // codes, so only demote it where it signals a procedural complication.
      if(/sequela/.test(desc) && !/^[VWXYST]/.test(row[2])) score+=3;
      if(/\bunspecified\b/.test(desc)) score+=0.3;
      if(row[4]===1||row[4]==='1') score-=0.2;
      scored.push([score, desc.length, row]);
    }
    scored.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    return scored.slice(0,80).map(s=>s[2]);
  },[q, codeDB, filterSys, sysFilter]);

  const doCopy = (code)=>{
    try{ navigator.clipboard.writeText(code); }catch(e){}
    setCopied(true); setTimeout(()=>setCopied(false), 1400);
  };
  // --- Alphabetic Index helpers ---
  // function declaration (hoisted) so every memo below can use it safely
  function nrm(t){ return String(t).replace(/\([^)]*\)/g,'').replace(/\s+/g,' ').trim().toLowerCase(); }
  const ACTIVE = (mode==='eindex') ? EIDX : IDX;
  const mainTerms = React.useMemo(()=>{
    const t=iq.trim().toLowerCase();
    if(!t) return ACTIVE.slice(0,60);
    const starts=[], contains=[];
    for(let i=0;i<ACTIVE.length;i++){
      const n=nrm(ACTIVE[i].t);
      if(n.indexOf(t)===0) starts.push(ACTIVE[i]);
      else if(n.indexOf(t)!==-1) contains.push(ACTIVE[i]);
      if(starts.length>=400) break;
    }
    return starts.concat(contains).slice(0,400);
  },[iq, ACTIVE]);

  const [fam, setFam] = React.useState(null); // {stem, from} when drilled from Index
  const gotoTabular = (code, fromTerm)=>{
    const stem=String(code).replace(/-$/,'');
    setMode('tabular'); setSelected(null); setSysFilter('icd');
    setFam({stem:stem, from:fromTerm||''}); setQ(stem);
  };
  // normalized title (drop parenthetical modifiers) for matching
  const mainMap = React.useMemo(()=>{
    const m={}; const order=[];
    ACTIVE.forEach(x=>{ const k=nrm(x.t); if(!(k in m)){ m[k]=x; order.push(k); } });
    order.sort((a,b)=>b.length-a.length);
    return {map:m, titles:order};
  },[ACTIVE]);

  const findMain = (ref)=>{
    const r=nrm(ref); const {map,titles}=mainMap;
    if(map[r]) return {node:map[r], rest:''};
    for(let i=0;i<titles.length;i++){
      const t=titles[i];
      if(r.indexOf(t+' ')===0 || r.indexOf(t+',')===0)
        return {node:map[t], rest:r.slice(t.length).replace(/^[\s,]+/,'')};
    }
    // first-word fallback: "Fracture, radius..." -> "fracture, traumatic"
    const w=r.split(',')[0].split(' ')[0];
    let best=null;
    if(map[w]) best=w;
    else if(map[w+', traumatic']) best=w+', traumatic';
    else { const c=titles.filter(t=>t===w||t.indexOf(w+',')===0||t.indexOf(w+' ')===0);
           if(c.length) best=c.sort((a,b)=>a.length-b.length)[0]; }
    if(best){
      const rest = r.indexOf(best)===0 ? r.slice(best.length).replace(/^[\s,]+/,'')
                 : (r.indexOf(',')!==-1 ? r.slice(r.indexOf(',')+1).trim() : '');
      return {node:map[best], rest:rest};
    }
    return null;
  };

  const followRef = (target)=>{ // "see" / "see also" cross-reference
    const raw=String(target);
    // references to a code / category range -> verify directly in the Tabular
    const cm=raw.match(/\b([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]+)?)\b/);
    if(cm && !/^table of drugs/i.test(raw)){
      const hit0=findMain(raw);
      if(!hit0){ gotoTabular(cm[1], raw); return; }
    }
    if(/^table of drugs/i.test(raw)){
      const after=raw.replace(/^table of drugs and chemicals[,\s]*/i,'').split(',')[0].trim();
      setMode('drug'); setTq(/^(categories|by |with )/i.test(after)? '' : after); return;
    }
    const hit=findMain(target);
    if(!hit){ setRefNote(raw); setIq(String(target).split(',')[0].trim()); setTrail([]); return; }
    setRefNote('');
    let n=hit.node; const opens={};
    const segs=hit.rest? hit.rest.split(',').map(s=>s.trim()).filter(Boolean) : [];
    let pathKey='';
    for(let i=0;i<segs.length;i++){
      const s=segs[i], d=n.d||[];
      let k=-1;
      for(let j=0;j<d.length;j++){ if(nrm(d[j].t)===s){ k=j; break; } }
      if(k<0) for(let j=0;j<d.length;j++){ if(nrm(d[j].t).indexOf(s)===0){ k=j; break; } }
      if(k<0) for(let j=0;j<d.length;j++){ if(nrm(d[j].t).indexOf(s)!==-1){ k=j; break; } }
      if(k<0) break;
      pathKey = pathKey? pathKey+'.'+k : String(k);
      opens[pathKey]=true;
      n=d[k];
    }
    setTrail([hit.node]); setOpenK(opens); setIq('');
  };
  const modeBtn = (id,label,sub)=> e('button',{ key:id, onClick:()=>setMode(id),
    style:{flex:1,textAlign:'left',padding:'11px 14px',borderRadius:10,cursor:'pointer',
      border:'2px solid '+(mode===id?'var(--teal)':'var(--line)'),
      background:mode===id?'#eefaf8':'#fff'}},
    e('div',{style:{fontSize:13.5,fontWeight:800,color:mode===id?'var(--teal)':'var(--ink)'}}, label),
    e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:2}}, sub));

  // recursive sub-term renderer (book indentation)
  const renderNode = (node, path, depth)=>{
    const key=path;
    const kids=node.d||[];
    const isOpen=!!openK[key];
    return e('div',{key:key, style:{marginLeft: depth===0?0:16}},
      e('div',{ onClick:()=>{ if(kids.length) setOpenK(Object.assign({},openK,{[key]:!isOpen})); },
        style:{display:'flex',alignItems:'baseline',gap:8,padding:'5px 6px',borderRadius:6,
          cursor:kids.length?'pointer':'default',borderLeft: depth>0?'1px dotted var(--line)':'none'}},
        e('span',{style:{fontSize:11,color:'var(--muted)',minWidth:10}}, kids.length?(isOpen?'\u25be':'\u25b8'):'\u00b7'),
        e('span',{style:{fontSize:13.5,color:'var(--ink)'}}, node.t),
        node.c && e('span',{ onClick:(ev)=>{ ev.stopPropagation(); gotoTabular(node.c, node.t); },
          style:{fontSize:12.5,fontWeight:800,color:'var(--teal)',fontFamily:"'SF Mono',monospace",cursor:'pointer',
            border:'1px solid var(--teal)',borderRadius:5,padding:'1px 7px'}}, node.c),
        node.s && e('span',{ onClick:(ev)=>{ ev.stopPropagation(); followRef(node.s); },
          style:{fontSize:12,fontStyle:'italic',color:'#8B5CF6',cursor:'pointer'}}, 'see '+node.s),
        node.sa && e('span',{ onClick:(ev)=>{ ev.stopPropagation(); followRef(node.sa); },
          style:{fontSize:12,fontStyle:'italic',color:'#8B5CF6',cursor:'pointer'}}, 'see also '+node.sa)
      ),
      isOpen && kids.map((k,i)=>renderNode(k, key+'.'+i, depth+1))
    );
  };

  const indexPanel = ()=>{
    const cur = trail.length ? trail[trail.length-1] : null;
    return e('div',null,
      e('div',{style:{position:'relative',marginBottom:10}},
        e('input',{ value:iq,
          placeholder: idxLoading? 'Loading the index\u2026'
            : (mode==='eindex'
               ? 'Look up how the injury happened \u2014 e.g. Fall, Struck, Bite, Assault, Contact\u2026'
               : 'Look up a main term \u2014 e.g. Pain, Fracture, Diabetes, Laceration, Burn\u2026'),
          onChange:ev=>{ setIq(ev.target.value); setTrail([]); setRefNote(''); },
          style:{width:'100%',padding:'13px 16px',fontSize:15,border:'1px solid var(--line)',borderRadius:10,outline:'none',boxSizing:'border-box'} }),
        e('span',{style:{position:'absolute',right:14,top:13,fontSize:11,color: idxLoading?'var(--mod)':'var(--ok)'}},
          idxLoading? 'loading\u2026' : ACTIVE.length.toLocaleString()+' main terms')),
      mode==='eindex' && e('div',{style:{fontSize:12,color:'var(--muted)',lineHeight:1.55,marginBottom:10,
        background:'#fff8ec',border:'1px solid #f0d9a8',borderRadius:8,padding:'9px 12px'}},
        'This is the separate ',e('b',null,'Index to External Causes'),' \u2014 it indexes how an injury happened, not the injury itself. Look up the mechanism (Fall, Struck by, Bite, Assault), then the circumstances. These codes are ',
        e('b',null,'never first-listed'),' \u2014 report them after the injury code.'),
      refNote && e('div',{style:{fontSize:12,color:'var(--mod)',background:'#fff8ec',border:'1px solid #f0d9a8',
        borderRadius:6,padding:'8px 11px',marginBottom:10,display:'flex',justifyContent:'space-between',gap:10}},
        e('span',null, /^table of drugs/i.test(refNote)
          ? 'The Index points to the Table of Drugs and Chemicals \u2014 a separate table for poisonings and adverse effects, not part of the alphabetic index.'
          : 'The Index refers you to: \u201c'+refNote+'\u201d \u2014 follow that instruction in the Tabular List.'),
        e('span',{ onClick:()=>setRefNote(''), style:{cursor:'pointer',fontWeight:800}}, '\u00d7')),
      cur && e('div',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:10,fontSize:12.5}},
        e('span',{ onClick:()=>{ setTrail([]); setOpenK({}); },
          style:{color:'var(--teal)',fontWeight:700,cursor:'pointer'}}, '\u2190 All main terms'),
        e('span',{style:{color:'var(--muted)'}}, '/'),
        e('span',{style:{fontWeight:800,color:'var(--ink)'}}, cur.t)),
      e('div',{style:{background:'#fff',border:'1px solid var(--line)',borderRadius:12,padding:'12px 14px'}},
        !cur
          ? (mainTerms.length===0
              ? e('div',{style:{padding:'28px 8px',textAlign:'center',color:'var(--muted)',fontSize:13}},
                  idxLoading? 'Loading the Alphabetic Index\u2026' : 'No main term starts with that. Try the condition, not the site \u2014 the book indexes "Laceration, forearm", not "Forearm laceration".')
              : mainTerms.map((m,i)=> e('div',{ key:i,
                  onClick:()=>{ setTrail([m]); setOpenK({}); setRefNote(''); },
                  style:{display:'flex',alignItems:'center',gap:10,padding:'10px 8px',cursor:'pointer',
                    borderBottom: i<mainTerms.length-1?'1px solid var(--line-soft)':'none'}},
                  e('span',{style:{fontSize:14.5,fontWeight:800,color:'var(--navy)'}}, m.t),
                  m.c && e('span',{style:{fontSize:12,fontWeight:700,color:'var(--teal)',fontFamily:"'SF Mono',monospace"}}, m.c),
                  e('span',{style:{marginLeft:'auto',fontSize:11,color:'var(--muted)'}}, (m.d?m.d.length:0)+' sub-terms \u203a'))))
          : e('div',null,
              e('div',{style:{fontSize:17,fontWeight:900,color:'var(--navy)',marginBottom:2}}, cur.t),
              cur.sa && e('div',{ onClick:()=>followRef(cur.sa),
                style:{fontSize:12,fontStyle:'italic',color:'#8B5CF6',cursor:'pointer',marginBottom:8}}, 'see also '+cur.sa),
              e('div',{style:{fontSize:11,color:'var(--muted)',marginBottom:10}},
                'Click a sub-term to open deeper levels. Click a code to verify it in the Tabular List.'),
              (cur.d||[]).map((k,i)=>renderNode(k, String(i), 0)))
      ),
      e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:8}},
        (iq.trim()? '' : 'Showing the first 60 main terms \u2014 type to search all '+(ACTIVE.length||0).toLocaleString()+'. ')+
        (mode==='eindex'
          ? 'Official CMS ICD-10-CM Index to External Causes, FY2026. Never code directly from the Index \u2014 always verify in the Tabular List.'
          : 'Official CMS ICD-10-CM Alphabetic Index, FY2026. Never code directly from the Index \u2014 always verify in the Tabular List.'))
    );
  };

  // --- Code family expansion (Index -> Tabular verification step) ---
  const famRows = React.useMemo(()=>{
    if(!fam || !codeDB) return [];
    const p=fam.stem.replace(/\./g,'').toLowerCase();
    const out=[];
    for(let i=0;i<codeDB.length;i++){
      const r=codeDB[i];
      if(r[0]!==0) continue;
      if(r[1].toLowerCase().indexOf(p)===0) out.push(r);
    }
    out.sort((a,b)=> a[1]<b[1]?-1:a[1]>b[1]?1:0);
    return out;
  },[fam, codeDB]);

  const EXT = {A:'Initial encounter',D:'Subsequent encounter',S:'Sequela',
    B:'Initial \u2013 open fracture I/II',C:'Initial \u2013 open fracture IIIA/B/C',
    E:'Subsequent \u2013 open I/II, routine healing',F:'Subsequent \u2013 open III, routine healing',
    G:'Subsequent \u2013 delayed healing',H:'Subsequent \u2013 open I/II, delayed healing',
    J:'Subsequent \u2013 open III, delayed healing',K:'Subsequent \u2013 nonunion',
    M:'Subsequent \u2013 open I/II, nonunion',N:'Subsequent \u2013 open III, nonunion',
    P:'Subsequent \u2013 malunion',Q:'Subsequent \u2013 open I/II, malunion',
    R:'Subsequent \u2013 open III, malunion'};

  const familyPanel = ()=>{
    if(!fam) return null;
    const incomplete = famRows.length>1;
    return e('div',{style:{background:'#fff',border:'2px solid var(--teal)',borderRadius:12,padding:'16px 18px',marginBottom:16}},
      e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:10}},
        e('div',null,
          e('div',{style:{fontSize:11,fontWeight:800,color:'var(--teal)',letterSpacing:.6,marginBottom:3}}, 'FROM THE INDEX'),
          e('div',{style:{fontSize:16,fontWeight:900,color:'var(--navy)'}},
            fam.stem + (fam.from? '  \u2014  '+fam.from : ''))),
        e('button',{ onClick:()=>{ setFam(null); setMode('index'); },
          style:{fontSize:12,fontWeight:700,padding:'7px 13px',borderRadius:8,cursor:'pointer',
            border:'1px solid var(--line)',background:'#fff',color:'var(--muted)',whiteSpace:'nowrap'}}, '\u2190 Back to Index')),
      incomplete && e('div',{style:{fontSize:12,color:'var(--mod)',background:'#fff8ec',border:'1px solid #f0d9a8',
        borderRadius:6,padding:'8px 11px',marginBottom:12}},
        '\u26a0 This Index entry is not a complete code. '+famRows.length+
        ' codes sit beneath it \u2014 choose the one matching laterality and encounter documented in the chart.'),
      famRows.length===0
        ? e('div',{style:{fontSize:13,color:'var(--muted)',padding:'10px 0'}},
            dbStatus==='ready' ? 'No tabular entries found under this stem.' : 'Loading code database\u2026')
        : e('div',{style:{maxHeight:340,overflowY:'auto'}},
            famRows.map((r,i)=>{
              const c7=r[2].length===7? r[2].charAt(6).toUpperCase() : '';
              const ch=/[A-Z]/.test(c7)? c7 : '';
              const lbl=EXT[ch];
              return e('div',{ key:i, onClick:()=>{ setSelected(r); setCopied(false); },
                style:{display:'flex',alignItems:'center',gap:11,padding:'9px 8px',cursor:'pointer',
                  borderBottom: i<famRows.length-1?'1px solid var(--line-soft)':'none',
                  background: selected&&selected[2]===r[2]?'#eef4fb':'#fff'}},
                e('span',{style:{fontSize:13,fontWeight:800,color:'var(--navy)',fontFamily:"'SF Mono',monospace",minWidth:86}}, r[2]),
                lbl && e('span',{title:lbl, style:{fontSize:9.5,fontWeight:700,color:'#fff',background:'#8B5CF6',
                  padding:'2px 6px',borderRadius:4,whiteSpace:'nowrap'}}, ch+' \u00b7 '+lbl),
                e('span',{style:{fontSize:12.5,color:'var(--ink)',flex:1}}, r[3]),
                (r[4]===1||r[4]==='1') && e('span',{style:{fontSize:9,fontWeight:700,color:'var(--ok)'}}, '\u25cf'),
                onInsert && !(isHH && r[0]!==0) && e('button',{
                  onClick:(ev)=>{ ev.stopPropagation(); onInsert(r); setAdded(r[2]); setTimeout(()=>setAdded(''),1100); },
                  title:'Add '+r[2]+' to the chart',
                  style:{marginLeft:'auto',fontSize:10,fontWeight:800,padding:'2px 9px',borderRadius:5,
                    cursor:'pointer',whiteSpace:'nowrap',
                    border:'1px solid '+(added===r[2]?'var(--ok)':'var(--teal)'),
                    background: added===r[2]?'var(--ok)':'#fff',
                    color: added===r[2]?'#fff':'var(--teal-d)'}},
                  added===r[2]? '\u2713 added' : '+ add'));
            })),
      e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:10}},
        'Click the exact code to open its detail and copy it.')
    );
  };

  const tablePanel = ()=>{
    const isNeo = mode==='neo';
    const key = isNeo?'neo':'drug';
    const COLS = isNeo
      ? [{k:'Malignant Primary', c:'#B4232A'},{k:'Malignant Secondary', c:'#C4562A'},
         {k:'Ca in situ', c:'#8B5CF6'},{k:'Benign', c:'#0E7C66'},
         {k:'Uncertain Behavior', c:'#7A6A2E'},{k:'Unspecified Behavior', c:'#5A6472'}]
      : [{k:'Poisoning, Accidental', c:'#B4232A'},{k:'Poisoning, Self-harm', c:'#8B2E6B'},
         {k:'Poisoning, Assault', c:'#C4562A'},{k:'Poisoning, Undetermined', c:'#7A6A2E'},
         {k:'Adverse Effect', c:'#0E7C66'},{k:'Underdosing', c:'#5A6472'}];
    const rows = TBL[key];
    return e('div',null,
      e('div',{style:{fontSize:12.5,color:'var(--muted)',marginBottom:10,lineHeight:1.55}},
        isNeo
          ? 'Find the anatomical site, then read across to the column matching the documented behavior. Histology drives the column \u2014 check the Index first if the diagnosis names a cell type.'
          : 'Find the substance, then read across to the column matching the documented intent. Adverse effect means the drug was correctly prescribed and taken as directed; poisoning means it was not.'),
      e('div',{style:{position:'relative',marginBottom:10}},
        e('input',{ value:tq,
          placeholder: rows? (isNeo?'Search a site \u2014 e.g. breast, lung, kidney, colon\u2026'
                                   :'Search a substance \u2014 e.g. acetaminophen, insulin, warfarin\u2026')
                            : 'Loading table\u2026',
          onChange:ev=>setTq(ev.target.value),
          style:{width:'100%',padding:'13px 16px',fontSize:15,border:'1px solid var(--line)',borderRadius:10,outline:'none',boxSizing:'border-box'} }),
        e('span',{style:{position:'absolute',right:14,top:13,fontSize:11,color: rows?'var(--ok)':'var(--mod)'}},
          rows? rows.length.toLocaleString()+' rows' : 'loading\u2026')),
      e('div',{style:{background:'#fff',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden'}},
        !rows
          ? e('div',{style:{padding:'34px 20px',textAlign:'center',color:'var(--muted)',fontSize:13.5}}, 'Loading table\u2026')
          : (tableRows||[]).length===0
            ? e('div',{style:{padding:'34px 20px',textAlign:'center',color:'var(--muted)',fontSize:13.5}}, 'No match. Try a shorter or more general term.')
            : e('div',{style:{maxHeight:520,overflowY:'auto'}},
                (tableRows||[]).map((it,n)=>{
                  const r=it.r, anc=rowPath(rows, it.i);
                  return e('div',{key:n, style:{padding:'10px 14px',
                    borderBottom: n<(tableRows.length-1)?'1px solid var(--line-soft)':'none'}},
                    anc.length>0 && e('div',{style:{fontSize:10.5,color:'var(--muted)',marginBottom:2}}, anc.join(' \u203a ')),
                    e('div',{style:{fontSize:13.5,fontWeight:700,color:'var(--navy)',marginBottom:6,
                      paddingLeft: Math.min(r.l,4)*10}}, r.t),
                    e('div',{style:{display:'flex',flexWrap:'wrap',gap:6}},
                      COLS.map((c,ci)=>{
                        const v=r.c[ci];
                        if(!v) return e('span',{key:ci, style:{fontSize:10,color:'#c3c8cf',
                          border:'1px dashed var(--line)',borderRadius:5,padding:'3px 7px'}}, c.k+': \u2014');
                        return e('span',{key:ci, onClick:()=>gotoTabular(v, r.t),
                          title:'Verify '+v+' in the Tabular List',
                          style:{fontSize:10.5,cursor:'pointer',borderRadius:5,padding:'3px 8px',
                            border:'1px solid '+c.c, color:c.c, fontWeight:700, background:'#fff'}},
                          c.k+': ', e('span',{style:{fontFamily:"'SF Mono',monospace",fontWeight:800}}, v));
                      })));
                }))
      ),
      e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:8}},
        (tq.trim()? '' : 'Showing the first 80 rows \u2014 type to search all '+(rows?rows.length.toLocaleString():'\u2026')+'. ')+
        'Official CMS ICD-10-CM FY2026. Click any code to verify it in the Tabular List. A dash in the code means a further character is required.')
    );
  };

  const chip = (id,label)=> e('button',{ key:id,
    onClick:()=>{ setSysFilter(id); setSelected(null); },
    style:{fontSize:12,fontWeight:700,padding:'6px 13px',borderRadius:20,cursor:'pointer',marginRight:8,
      border:'1px solid '+(sysFilter===id?'var(--teal)':'var(--line)'),
      background:sysFilter===id?'var(--teal)':'#fff', color:sysFilter===id?'#fff':'var(--muted)'}}, label);

  return e('div',{className:'page', style: embedded?{padding:'12px 14px 18px'}:null},
    !embedded && e('div',{className:'page-head'}, e('h1',null,'CODIVIA Code Search'),
      e('p',{style:{color:'var(--muted)',margin:'4px 0 0',fontSize:13}},
        'Work it the way the codebook works: start in the Alphabetic Index, drill from the main term down to the sub-term, then verify the code and its instructional notes in the Tabular List. The Neoplasm and Drug tables work the same way \u2014 find the row, then pick the column.')),
    e('div',{style:{fontSize:10.5,fontWeight:800,color:'var(--muted)',letterSpacing:.7,marginBottom:6}},
      'ICD-10-CM \u00b7 DIAGNOSIS CODING'),
    e('div',{style:{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}},
      modeBtn('index','1 \u00b7 Alphabetic Index','Main term \u2192 sub-terms \u2192 code'),
      modeBtn('tabular','2 \u00b7 Tabular List','Verify the code and its notes'),
      modeBtn('neo','Neoplasm Table','Site \u00d7 behavior'),
      modeBtn('drug','Drugs & Chemicals','Substance \u00d7 intent'),
      modeBtn('eindex','External Cause Index','How the injury happened')),
    e('div',{style:{fontSize:10.5,fontWeight:800,color:'var(--muted)',letterSpacing:.7,marginBottom:6}},
      'PROCEDURE & SUPPLY CODING'),
    e('div',{style:{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}},
      modeBtn('cpt','CPT','Procedures & services'),
      modeBtn('hcpcs','HCPCS Level II','Supplies, drugs, DME'),
      modeBtn('pcs','ICD-10-PCS','Inpatient procedures')),
    (mode==='neo'||mode==='drug') ? tablePanel()
    : (mode==='index'||mode==='eindex') ? indexPanel() : e(React.Fragment,null,
    MODE_SYS[mode] && e('div',{style:{fontSize:12.5,color:'var(--muted)',marginBottom:10,lineHeight:1.55}},
      mode==='cpt' ? 'CPT codes report physician and outpatient procedures and services. Search by procedure name or code \u2014 then check whether a modifier is needed.'
      : mode==='hcpcs' ? 'HCPCS Level II covers supplies, drugs, DME and services CPT does not: A, E, J, K, L codes and more. Search by item or code.'
      : 'ICD-10-PCS codes inpatient hospital procedures. Every code is 7 characters, each character a value from a table \u2014 search by procedure name or partial code.'),
    !MODE_SYS[mode] && familyPanel(),
    !MODE_SYS[mode] && e('div',{style:{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}},
      chip('all','All code sets'), chip('icd','ICD-10-CM'), chip('pcs','ICD-10-PCS'), chip('cpt','CPT / HCPCS'),
      chip('ext','\u26a0 External cause'), chip('addon','+ Add-on codes')),
    e('div',{style:{position:'relative',marginBottom:8}},
      e('input',{ value:q, autoFocus:true,
        placeholder: dbStatus!=='ready' ? 'Loading code database\u2026'
          : mode==='cpt' ? 'Search a procedure or CPT code \u2014 e.g. colonoscopy, 45378\u2026'
          : mode==='hcpcs' ? 'Search a supply, drug or HCPCS code \u2014 e.g. wheelchair, J1885\u2026'
          : mode==='pcs' ? 'Search an inpatient procedure or PCS code \u2014 e.g. bypass, 0DTJ4ZZ\u2026'
          : 'Search a condition, procedure, or code\u2026',
        onChange:ev=>{ setQ(ev.target.value); setSelected(null); setFam(null); },
        style:{width:'100%',padding:'13px 16px',fontSize:15,border:'1px solid var(--line)',borderRadius:10,outline:'none',boxSizing:'border-box'} }),
      e('span',{style:{position:'absolute',right:14,top:13,fontSize:11,color: dbStatus==='ready'?'var(--ok)':'var(--mod)'}},
        dbStatus!=='ready' ? 'loading\u2026'
          : (modeCount!==null ? modeCount.toLocaleString()+' codes' : '171,568 codes')
    ),
    // detail panel (when a code is selected)
    selected && e('div',{style:{background:'#fff',border:'2px solid '+SYS[selected[0]].color,borderRadius:12,padding:'18px 20px',marginBottom:16}},
      e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}},
        e('div',null,
          e('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:6}},
            e('span',{style:{fontSize:26,fontWeight:900,color:'var(--navy)',fontFamily:"'SF Mono',monospace"}}, selected[2]),
            e('span',{style:{fontSize:11,fontWeight:800,color:'#fff',background:SYS[selected[0]].color,padding:'3px 9px',borderRadius:5}}, SYS[selected[0]].name),
            (selected[4]===1||selected[4]==='1')
              ? e('span',{style:{fontSize:10,fontWeight:700,color:'var(--ok)',border:'1px solid var(--ok)',borderRadius:5,padding:'2px 7px'}}, '\u2713 BILLABLE')
              : e('span',{style:{fontSize:10,fontWeight:700,color:'var(--muted)',border:'1px solid var(--line)',borderRadius:5,padding:'2px 7px'}}, 'NON-BILLABLE / HEADER')),
          e('div',{style:{fontSize:15,color:'var(--ink)',lineHeight:1.5}}, selected[3])),
        e('button',{ onClick:()=>doCopy(selected[2]),
          style:{fontSize:13,fontWeight:800,padding:'9px 18px',borderRadius:8,cursor:'pointer',whiteSpace:'nowrap',border:'none',
            background: copied?'var(--ok)':'var(--teal)', color:'#fff'}}, copied?'\u2713 Copied!':'Copy code')
      ),
      (selected[4]!==1 && selected[4]!=='1') && e('div',{style:{fontSize:11.5,color:'var(--mod)',marginTop:10,background:'#fff8ec',border:'1px solid #f0d9a8',borderRadius:6,padding:'7px 10px'}},
        '\u26a0 This is a category/header code and is not billable on its own \u2014 assign a more specific code beneath it.'),
      (function(){
        const groups = selected[0]===0 ? notesFor(selected[2]) : [];
        // CPT add-on codes get their own explanation panel
        if(selected[0]===2){
          if(!isAddOn(selected)) return null;
          return e('div',{style:{background:'#f5f1fc',border:'1px solid #ded2f2',borderRadius:10,
            padding:'13px 16px',marginTop:14,lineHeight:1.65,fontSize:13.5,color:'var(--ink)'}},
            e('div',{style:{fontSize:11,fontWeight:800,color:'#7A5AB8',letterSpacing:.5,marginBottom:6}},
              '+ ADD-ON CODE'),
            e('span',null,'CPT ',
              e('b',{style:{fontFamily:"'SF Mono',monospace"}}, selected[2]),
              ' is an add-on code. It reports work performed in addition to a primary procedure and is ',
              e('b',null,'never reported on its own'),
              '. Report it alongside its designated primary procedure, and do ',
              e('b',null,'not'),
              ' append modifier 51 \u2014 add-on codes are exempt from multiple-procedure reduction.'));
        }
        if(selected[0]!==0) return null;
        const META = {
          inc:  {label:'Includes',        color:'#0E7C66', bg:'#eefaf8', bd:'#bfe6dd',
                 hint:'Terms that ARE coded here.'},
          ex1:  {label:'Excludes1',       color:'#B4232A', bg:'#fdeeee', bd:'#f3c9c9',
                 hint:'NEVER code together \u2014 the two conditions cannot coexist.'},
          ex2:  {label:'Excludes2',       color:'#B4232A', bg:'#fdf3ee', bd:'#f3d9c9',
                 hint:'Not included here, but MAY be coded together if both are documented.'},
          use:  {label:'Use additional code', color:'#7A5AB8', bg:'#f5f1fc', bd:'#ded2f2',
                 hint:'Add this secondary code when documented.'},
          first:{label:'Code first',      color:'#7A5AB8', bg:'#f5f1fc', bd:'#ded2f2',
                 hint:'The underlying condition is sequenced BEFORE this code.'},
          also: {label:'Code also',       color:'#7A5AB8', bg:'#f5f1fc', bd:'#ded2f2',
                 hint:'Both codes may be needed; sequencing depends on the encounter.'},
          note: {label:'Note',            color:'#5A6472', bg:'#f4f6f8', bd:'#dfe4ea', hint:''}
        };
        const ORDER=['inc','ex1','ex2','use','first','also','note'];

        // ---- plain-English summary of what this code means and requires ----
        const self = groups.filter(x=>x.self);
        const inherited = groups.filter(x=>!x.self);
        const billable = (selected[4]===1 || selected[4]==='1');
        const collect = (k)=> groups.reduce((a,g)=> a.concat(g.notes[k]||[]), []);
        const fmt = (arr)=> arr.length<=3 ? arr.join('; ')
                    : arr.slice(0,3).join('; ')+' and '+(arr.length-3)+' more listed below';
        const needsUse   = collect('use');
        const needsFirst = collect('first');
        const needsAlso  = collect('also');
        const hasEx1     = collect('ex1');

        const bits = [];
        bits.push(e('span',{key:'d'},
          'ICD-10-CM code ',
          e('b',{style:{fontFamily:"'SF Mono',monospace"}}, selected[2]),
          ' denotes ',
          e('b',null, selected[3]),
          '. '));
        bits.push(e('span',{key:'b'},
          billable
            ? 'This is a billable code'
            : 'This is a non-billable category or header code and cannot be reported on a claim on its own',
          (needsUse.length || needsFirst.length) ? ', but ' : '. '));
        if(needsFirst.length){
          bits.push(e('span',{key:'f'},
            'it requires the underlying condition to be sequenced first (',
            e('b',null, needsFirst[0]), ')',
            needsUse.length ? ', and ' : '. '));
        }
        if(needsUse.length){
          bits.push(e('span',{key:'u'},
            'it requires an additional code to identify ',
            e('b',null, fmt(needsUse)),
            '. '));
        }
        if(needsAlso.length){
          bits.push(e('span',{key:'a'},
            'The Tabular also directs you to code ',
            e('b',null, fmt(needsAlso)), '. '));
        }
        if(hasEx1.length){
          bits.push(e('span',{key:'x'},
            'An Excludes1 note applies, so it is never reported together with the conditions listed below. '));
        }
        if(!billable && !needsUse.length && !needsFirst.length){
          bits.push(e('span',{key:'m'}, 'Assign a more specific code beneath it. '));
        }
        if(isExtCause(selected)){
          const ch = selected[2].charAt(0);
          const kind = ch==='Y' && /place of occurrence/i.test(selected[3]) ? 'place of occurrence'
                     : ch==='Y' && /^Y93/.test(selected[2]) ? 'activity'
                     : ch==='Y' && /^Y99/.test(selected[2]) ? 'external cause status'
                     : 'cause of injury';
          bits.push(e('span',{key:'e'},
            'This is an external cause code (', e('b',null, kind),
            '). It is ', e('b',null,'never a first-listed or principal diagnosis'),
            ' \u2014 report it after the injury or condition it explains.',
            /^Y9[239]/.test(selected[2])
              ? ' Place of occurrence, activity and status are each reported once, at the initial encounter only.'
              : ''));
        }

        const summary = e('div',{style:{background:'#0f2f56',color:'#fff',borderRadius:10,
          padding:'13px 16px',marginTop:14,lineHeight:1.65,fontSize:13.5}}, bits);

        return e('div',null, summary,
          groups.length>0 && e('div',{style:{marginTop:14,borderTop:'1px solid var(--line-soft)',paddingTop:12}},
          e('div',{style:{fontSize:11,fontWeight:800,color:'var(--muted)',letterSpacing:.6,marginBottom:8}},
            'TABULAR LIST INSTRUCTIONAL NOTES'),
          groups.map((g,gi)=>
            e('div',{key:gi, style:{marginBottom:10}},
              !g.self && e('div',{style:{fontSize:11,color:'var(--muted)',marginBottom:5}},
                'Inherited from category ',
                e('span',{style:{fontWeight:800,color:'var(--navy)',fontFamily:"'SF Mono',monospace"}}, g.code),
                ' \u2014 applies to every code beneath it.'),
              ORDER.filter(k=>g.notes[k]).map(k=>{
                const M=META[k];
                return e('div',{key:k, style:{background:M.bg,border:'1px solid '+M.bd,borderRadius:8,
                  padding:'8px 11px',marginBottom:6}},
                  e('div',{style:{display:'flex',alignItems:'baseline',gap:8,flexWrap:'wrap',marginBottom:4}},
                    e('span',{style:{fontSize:11,fontWeight:800,color:M.color}}, M.label),
                    M.hint && e('span',{style:{fontSize:10.5,color:'var(--muted)'}}, M.hint)),
                  e('ul',{style:{margin:0,paddingLeft:18}},
                    g.notes[k].map((t,ti)=> e('li',{key:ti, style:{fontSize:12.5,color:'var(--ink)',lineHeight:1.5}}, t))));
              }))))
        );
      })()
    ),
    // results list
    !fam && e('div',{style:{background:'#fff',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden'}},
      (q.trim().length<2)
        ? e('div',{style:{padding:'34px 20px',textAlign:'center',color:'var(--muted)',fontSize:13.5}},
            'Start typing to search the codebook. Try "diabetes", "fracture radius", "colonoscopy", or a partial code like "S52".')
        : results.length===0
          ? e('div',{style:{padding:'34px 20px',textAlign:'center',color:'var(--muted)',fontSize:13.5}},
              dbStatus==='ready' ? 'No matches. Try fewer or different words, or a code prefix.' : 'Loading code database\u2026')
          : results.map((r,i)=> e('div',{ key:i,
              onClick:()=>{ setSelected(r); setCopied(false); },
              style:{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',cursor:'pointer',
                borderBottom: i<results.length-1?'1px solid var(--line-soft)':'none',
                background: selected&&selected[2]===r[2]?'#eef4fb':'#fff'} },
              e('span',{style:{fontSize:13,fontWeight:800,color:'var(--navy)',fontFamily:"'SF Mono',monospace",minWidth:82}}, r[2]),
              e('span',{style:{fontSize:10,fontWeight:700,color:'#fff',background:SYS[r[0]].color,padding:'2px 7px',borderRadius:4,minWidth:44,textAlign:'center'}}, SYS[r[0]].short),
              onInsert && !(isHH && r[0]!==0) && e('button',{
                onClick:(ev)=>{ ev.stopPropagation(); onInsert(r); setAdded(r[2]); setTimeout(()=>setAdded(''),1100); },
                title:'Add '+r[2]+' to the chart',
                style:{fontSize:10,fontWeight:800,padding:'2px 9px',borderRadius:5,cursor:'pointer',
                  whiteSpace:'nowrap',
                  border:'1px solid '+(added===r[2]?'var(--ok)':'var(--teal)'),
                  background: added===r[2]?'var(--ok)':'#fff',
                  color: added===r[2]?'#fff':'var(--teal-d)'}},
                added===r[2]? '\u2713 added' : '+ add'),
              isAddOn(r)? e('span',{title:'Add-on code \u2014 never reported alone, and exempt from modifier 51',
                style:{fontSize:10,fontWeight:800,color:'#7A5AB8',background:'#f5f1fc',border:'1px solid #ded2f2',
                  padding:'2px 6px',borderRadius:4,whiteSpace:'nowrap'}}, '+ ADD-ON') : null,
              isExtCause(r)? e('span',{title:'External cause of morbidity \u2014 never a first-listed diagnosis',
                style:{fontSize:10,fontWeight:800,color:'#9a6b12',background:'#fff2cf',border:'1px solid #e3bd5c',
                  padding:'2px 6px',borderRadius:4,whiteSpace:'nowrap'}}, '\u26a0 EXT CAUSE') : null,
              e('span',{style:{fontSize:13,color:'var(--ink)',flex:1}}, r[3]),
              (r[4]===1||r[4]==='1') && e('span',{style:{fontSize:9,fontWeight:700,color:'var(--ok)'}}, '\u25cf'))
          )
    ),
    !fam && q.trim().length>=2 && results.length>0 && e('div',{style:{fontSize:11,color:'var(--muted)',marginTop:8,textAlign:'right'}},
      'Showing top '+results.length+' matches \u00b7 click a row for full detail and copy')
    ))
  );
}

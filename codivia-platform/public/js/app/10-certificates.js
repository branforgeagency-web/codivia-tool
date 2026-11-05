/* CODIVIA platform — certificate uploads + certificate view */
// ---- Student certificate uploads (AAPC + educational certs) ----
function MyCertificates({ stu }){
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = React.useRef(null);

  const refresh = React.useCallback(()=>{
    if(!stu.uid || !window.CV_FB){ setItems([]); return; }
    window.CV_FB.listCerts(stu.uid).then(setItems).catch(e=>{ console.error(e); setItems([]); });
  },[stu.uid]);

  useEffect(()=>{ refresh(); },[refresh]);

  const onPick = async (ev)=>{
    const file = ev.target.files && ev.target.files[0];
    if(!file) return;
    setErr('');
    const okType = /^image\//.test(file.type) || file.type==='application/pdf';
    if(!okType){ setErr('Please upload an image (JPG/PNG) or a PDF.'); return; }
    if(file.size > 10*1024*1024){ setErr('File is too large. Maximum size is 10 MB.'); return; }
    setBusy(true);
    try{ await window.CV_FB.uploadCert(stu.uid, file); refresh(); }
    catch(e){ console.error(e); setErr('Upload failed. Please try again.'); }
    setBusy(false);
    if(fileRef.current) fileRef.current.value = '';
  };

  const remove = async (path)=>{
    setBusy(true);
    try{ await window.CV_FB.deleteCert(path); refresh(); }
    catch(e){ console.error(e); setErr('Could not delete that file.'); }
    setBusy(false);
  };

  return e('div',null,
    e('div',{className:'page-head'}, e('h1',null,'My Certificates'),
      e('p',null,'Upload your AAPC certification and any educational certificates. Only you can see these.')),
    e('div',{className:'card'},
      e('div',{style:{padding:'22px', textAlign:'center', border:'2px dashed var(--line)', borderRadius:12, margin:'6px'}},
        e('div',{style:{fontSize:30, marginBottom:8}}, '📎'),
        e('div',{style:{fontWeight:700, marginBottom:4}}, 'Upload a certificate'),
        e('div',{style:{fontSize:12, color:'var(--muted)', marginBottom:14}}, 'JPG, PNG or PDF · up to 10 MB'),
        e('input',{ ref:fileRef, type:'file', accept:'image/*,application/pdf', style:{display:'none'}, onChange:onPick }),
        e('button',{ className:'btn btn-teal', disabled:busy, onClick:()=> fileRef.current && fileRef.current.click() },
          busy ? 'Uploading…' : '+ Choose file'),
        err && e('div',{style:{color:'#d33', fontSize:12, marginTop:10}}, err)
      )
    ),
    e('div',{className:'card', style:{marginTop:16}},
      e('div',{className:'card-h'}, e('h3',null,'Uploaded certificates')),
      items===null
        ? e('div',{style:{padding:20, color:'var(--muted)', fontSize:13}}, 'Loading…')
        : items.length===0
          ? e('div',{style:{padding:20, color:'var(--muted)', fontSize:13}}, 'No certificates uploaded yet.')
          : e('table',null,
              e('thead',null, e('tr',null, ['File','',''].map((h,i)=>e('th',{key:i}, h)))),
              e('tbody',null, items.map((it,idx)=> e('tr',{key:idx},
                e('td',null, e('span',{style:{fontWeight:600}}, it.name)),
                e('td',null, e('a',{href:it.url, target:'_blank', rel:'noopener noreferrer',
                  style:{color:'var(--teal-d)', fontWeight:700, fontSize:12}}, 'View')),
                e('td',{style:{textAlign:'right'}}, e('button',{ className:'btn btn-ghost', disabled:busy,
                  onClick:()=>remove(it.path), style:{fontSize:12} }, 'Delete'))
              )))
            )
    )
  );
}

function CertificateView({ stu, stats }){
  const certified = Object.entries(stats.perDept).filter(([,st])=>st.certified);
  if(certified.length===0){
    return e('div',null,
      e('div',{className:'page-head'}, e('h1',null,'Certificate'),
        e('p',null,'Your digital certificate generates automatically once you complete '+CERT_THRESHOLD+' charts in a department.')),
      e('div',{className:'card'}, e('div',{style:{padding:40,textAlign:'center',color:'var(--muted)'}},
        e('div',{style:{fontSize:34,marginBottom:10}},'🔒'),
        e('div',{style:{fontWeight:700,color:'var(--ink)',marginBottom:4}},'No certificate yet'),
        e('div',null,'Complete '+CERT_THRESHOLD+' charts in any department to unlock your certificate.')))
    );
  }
  return e('div',null,
    e('div',{className:'page-head'}, e('h1',null,'Your Certificate'),
      e('p',null,'Auto-generated from your completed work. Download as PDF.')),
    certified.map(([dk,st])=> e(Certificate,{ key:dk, stu, dept:dk, st }))
  );
}

function Certificate({ stu, dept, st }){
  const d = DEPTS[dept];
  const certId = 'CDV-2026-'+String(1000+parseInt(stu.id.replace(/\D/g,''))).padStart(6,'0');
  return e('div',{className:'print-area', style:{marginBottom:16}},
    e('div',{className:'cert-body', style:{background:'#141210',borderRadius:14,padding:'30px 34px',color:'#fff'}},
      e('div',{style:{display:'flex',alignItems:'center',gap:11,marginBottom:22}},
        e('img',{src:window.CV_LOGO, style:{height:34}}),
        e('div',null, e('div',{style:{fontWeight:900,letterSpacing:2,fontSize:17}},'CODIVIA'),
          e('div',{style:{fontSize:8,letterSpacing:2,color:'#F26722',fontWeight:700}},'CODE · VALIDATE · GET HIRED')),
        e('div',{style:{marginLeft:'auto',textAlign:'right'}},
          e('div',{style:{fontSize:10,color:'#8fa3ba'}},'Certificate ID'),
          e('div',{style:{fontSize:12,fontFamily:'monospace'}}, certId))
      ),
      e('div',{style:{fontSize:11,letterSpacing:1,color:'#F26722',textTransform:'uppercase'}},'Certificate of Coding Proficiency'),
      e('div',{style:{fontSize:27,fontWeight:900,margin:'8px 0 5px'}}, stu.name),
      e('div',{style:{fontSize:13,color:'#cdd9e5',lineHeight:1.6}},
        'has successfully processed ', e('b',{style:{color:'#fff'}}, st.worked+' '+d.name+' charts'),
        ' on the CODIVIA live coding platform, demonstrating production-ready proficiency in ICD-10-CM, CPT, and HCPCS.'),
      e('div',{style:{display:'flex',gap:34,marginTop:22,paddingTop:18,borderTop:'1px solid rgba(255,255,255,.15)'}},
        e(CertStat,{n:st.worked, l:'Charts processed', c:'#F26722'}),
        e(CertStat,{n:st.avg+'%', l:'Average accuracy', c:'#F26722'}),
        e(CertStat,{n:(d.elements||[]).map(x=>ELEMENT_LABELS[x]||x).join(' · '), l:'Code sets', c:'#E5A82E'}),
        e('div',{style:{marginLeft:'auto',textAlign:'right',alignSelf:'flex-end'}},
          e('div',{style:{fontSize:11,color:'#8fa3ba'}},'Issued'),
          e('div',{style:{fontSize:12}}, new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})))
      )
    ),
    e('div',{style:{marginTop:12,display:'flex',gap:10}},
      e('button',{className:'btn btn-teal', onClick:doPrint},'⬇ Download PDF')
    )
  );
}
function CertStat({n,l,c}){
  return e('div',null, e('div',{style:{fontSize:24,fontWeight:900,color:c}},n),
    e('div',{style:{fontSize:10,color:'#8fa3ba',textTransform:'uppercase',letterSpacing:.5}},l));
}

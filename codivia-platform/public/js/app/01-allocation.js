/* CODIVIA platform — chart allocation model + small helpers */
// ---- Allocation range model ----
// An allocation value per department is EITHER a legacy number N (meaning charts
// 1..N) OR a range object {start,end} (1-based, inclusive) meaning charts
// start..end of that department's pool. These helpers normalise both forms so
// every read site can treat allocation uniformly.
function allocRange(val, poolLen){
  if(val==null) return null;
  if(typeof val==='number'){
    const n=Math.max(0,Math.min(val|0, poolLen));
    return n>0 ? {start:1, end:n} : null;
  }
  if(typeof val==='object'){
    let s=Math.max(1, Math.min((val.start|0)||1, poolLen));
    let en=Math.max(s, Math.min((val.end|0)||0, poolLen));
    if(en<1) return null;
    return {start:s, end:en};
  }
  return null;
}
function allocCount(val, poolLen){
  const r=allocRange(val, poolLen);
  return r ? (r.end - r.start + 1) : 0;
}
// zero-based slice indices for pool.slice(a,b)
function allocSlice(val, poolLen){
  const r=allocRange(val, poolLen);
  return r ? [r.start-1, r.end] : [0,0];
}
// do two allocation values overlap within the same pool?
function allocOverlap(a, b, poolLen){
  const ra=allocRange(a,poolLen), rb=allocRange(b,poolLen);
  if(!ra||!rb) return null;
  const lo=Math.max(ra.start, rb.start), hi=Math.min(ra.end, rb.end);
  return lo<=hi ? {start:lo, end:hi} : null;
}

// Only departments that actually have charts behind them should ever be shown
// or allocated — a tile with an empty queue is worse than no tile.
function deptHasCharts(key){
  const d = (window.CHART_DATA && window.CHART_DATA[key]) || null;
  return !!(d && d.length);
}
function activeDeptKeys(){
  return Object.keys(DEPTS).filter(deptHasCharts);
}
// Reusable element-tiles renderer
function ElementTiles(props){
  var els = (props.dept && props.dept.elements) || [];
  return e('div',{className:'el-tiles'+(props.setting?' setting':'')},
    els.map(function(x){ return e('span',{key:x,className:'el-tile'}, ELEMENT_LABELS[x]||x); })
  );
}
// Print only the .print-area card (adds body.printing during print, removes after)
function doPrint(){
  document.body.classList.add('printing');
  var cleanup=function(){ document.body.classList.remove('printing'); window.removeEventListener('afterprint',cleanup); };
  window.addEventListener('afterprint',cleanup);
  window.print();
  // fallback cleanup in case afterprint doesn't fire
  setTimeout(cleanup, 1500);
}

// Demo students, each cleared for departments + allocation counts
const STUDENTS = [
  { id:'STU-001', name:'Priya Raman', pin:'1111', depts:{ ED_PRO:120, ED_FAC:80, IM:150, EM:100, IP:200, HH:150 } },
  { id:'STU-002', name:'Arun Kumar', pin:'2222', depts:{ GENSURG:200, CARDIO:120, ORTHO:150, HCC:180 } },
  { id:'STU-003', name:'Divya Nair', pin:'3333', depts:{ OBGYN:180, GI:200, DERM:120, HH:150 } },
];

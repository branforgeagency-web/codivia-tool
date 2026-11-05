/* CODIVIA platform — auditor view */
// ---------------- AUDITOR ----------------
function AuditorApp({ session, onLogout }){
  return e(React.Fragment,null,
    e(TopBar,{ session, onLogout }),
    e('div',{className:'wrap'},
      e('div',{className:'page-head'}, e('h1',null,'Audit Station'),
        e('p',null,'The software auto-scores every submission. Auditor spot-checks flagged charts here.')),
      e('div',{className:'card'}, e('div',{style:{padding:30, textAlign:'center', color:'var(--muted)'}},
        'Auto-scoring is handled by the platform. Spot-check queue appears here as students submit.'))
    )
  );
}

function Stat({k,v,s,teal}){
  return e('div',{className:'stat'+(teal?' teal':'')}, e('div',{className:'k'},k), e('div',{className:'v'},v), s&&e('div',{className:'s'},s));
}

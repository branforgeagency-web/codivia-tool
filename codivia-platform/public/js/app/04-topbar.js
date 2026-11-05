/* CODIVIA platform — top bar */
// ---------------- TOPBAR ----------------
function TopBar({ session, onLogout, extra }){
  return e('div',{className:'topbar'},
    e('div',{className:'brand'},
      e('img',{src:window.CV_LOGO_WHITE, alt:'CODIVIA'})
    ),
    e('div',{className:'right'},
      extra,
      e('span',{className:'role-badge'}, (session.user && session.user.guest) ? 'guest' : session.role),
      e('span',{className:'who'}, e('b',null, session.user.name)),
      e('button',{className:'logout', onClick:onLogout}, (session.user && session.user.guest) ? 'Sign in to save progress' : 'Sign out')
    )
  );
}

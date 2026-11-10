/* CODIVIA platform — top header bar (logo, page info, role badge, sign in/out) */
import { brand } from '../../config/brand.js';

export function Header({ session, onLogout, 
  // extra,
   title }) {
  return (
    <header className="topbar">
      <div className="brand">
        <img src={brand.logoWhite} alt="CODIVIA" />
      </div>
      {title && <div className="header-location"><span>Workspace</span><span aria-hidden="true">/</span><b>{title}</b></div>}
      <div className="right">
        {/* {extra} */}
        <span className="role-badge">{session.role}</span>
        <span className="who">
          <b>{session.user.name}</b>
        </span>
        <button className="logout" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}

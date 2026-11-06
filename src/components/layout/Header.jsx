/* CODIVIA platform — top header bar (logo, page info, role badge, sign in/out) */
import { brand } from '../../config/brand.js';

export function Header({ session, onLogout, extra }) {
  const isGuest = !!(session.user && session.user.guest);
  return (
    <div className="topbar">
      <div className="brand">
        <img src={brand.logoWhite} alt="CODIVIA" />
      </div>
      <div className="right">
        {extra}
        <span className="role-badge">{isGuest ? 'guest' : session.role}</span>
        <span className="who">
          <b>{session.user.name}</b>
        </span>
        <button className="logout" onClick={onLogout}>
          {isGuest ? 'Sign in to save progress' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

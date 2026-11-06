/* CODIVIA platform — sidebar menu. Each item navigates to its route; the item whose
   path matches the current URL is highlighted. Extra content (score, footer) goes in children. */
import { useLocation, useNavigate } from 'react-router-dom';
import { NavIcon } from '../ui/NavIcon.jsx';

export function SidebarTile({ item, active, onClick }) {
  return (
    <button
      className={'side-tile' + (active ? ' active' : '') + (item.locked ? ' side-lock' : '')}
      style={{ '--tile-accent': item.accent, '--tile-accent2': item.accent2 }}
      type="button"
      aria-current={active ? 'page' : undefined}
      disabled={item.locked}
      title={item.locked ? item.lbl + ' (locked)' : item.lbl}
      aria-label={item.locked ? item.lbl + ' (locked)' : item.lbl}
      onClick={onClick}
    >
      <span className="ic"><NavIcon name={item.locked ? 'locked' : item.id} /></span>
      <span className="lbl">{item.lbl}</span>
      {item.count > 0 && <span className="badge-count">{item.count}</span>}
    </button>
  );
}

export function Sidebar({ items, children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="side-heading">Workspace</div>
      {items.map((item) => (
        <SidebarTile
          key={item.id}
          item={item}
          active={isActive(item.path)}
          onClick={() => (item.locked ? null : navigate(item.path))}
        />
      ))}
      {children}
    </nav>
  );
}

/* CODIVIA platform — dashboard layout: header on top, sidebar on the left, and the
   current route's page in the center (loaded on demand). */
import { RouteLoading } from '../ui/RouteLoading.jsx';
import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';

export function DashboardLayout({ session, onLogout, headerExtra, navItems, sidebarFooter, overlays }) {
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  useEffect(() => { mainRef.current?.scrollTo(0, 0); }, [pathname]);
  const currentPage = navItems.find(item => pathname === item.path || pathname.startsWith(item.path + '/'));
  return (
    <div className="dashboard-layout">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header session={session} onLogout={onLogout} extra={headerExtra} title={currentPage?.lbl} />
      <div className="shell">
        <Sidebar items={navItems}>{sidebarFooter}</Sidebar>
        <main className="main" id="main-content" ref={mainRef} tabIndex={-1}>
          <div className="page-content">
          <Suspense fallback={<RouteLoading />}>
            <Outlet />
          </Suspense>
          </div>
        </main>
      </div>
      {overlays}
    </div>
  );
}

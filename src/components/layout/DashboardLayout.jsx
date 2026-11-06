/* CODIVIA platform — dashboard layout: header on top, sidebar on the left, and the
   current route's page in the center (loaded on demand). */
import { RouteLoading } from '../ui/RouteLoading.jsx';
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';

export function DashboardLayout({ session, onLogout, headerExtra, navItems, sidebarFooter, overlays }) {
  return (
    <>
      <Header session={session} onLogout={onLogout} extra={headerExtra} />
      <div className="shell">
        <Sidebar items={navItems}>{sidebarFooter}</Sidebar>
        <main className="main" id="main-content">
          <Suspense fallback={<RouteLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      {overlays}
    </>
  );
}

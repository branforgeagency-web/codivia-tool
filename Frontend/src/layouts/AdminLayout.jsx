/* CODIVIA platform — admin dashboard layout: header + sidebar menu + routed page + modals */
import { useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx';
import { SidebarTile } from '../components/layout/Sidebar.jsx';
import { ADMIN_NAV } from '../config/navigation.js';
import { AdminProvider, useAdmin } from '../context/AdminContext.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { AdminModal } from '../pages/admin/components/AdminModal.jsx';
import { AdminChartView } from '../pages/admin/components/ChartViewModal.jsx';
import { AdminPerformance } from '../pages/admin/components/PerformanceModal.jsx';
import { theme } from '../theme/theme.js';

function AdminShell() {
  const { session, logout } = useSession();
  const { totals, refreshAll, modal, setModal, perfStudent, setPerfStudent, browseChart, setBrowseChart, notice, setNotice } =
    useAdmin();

  // Success messages fade on their own; errors stay until dismissed.
  useEffect(() => {
    if (!notice || notice.tone !== 'ok') return undefined;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  const students = totals ? totals.students : 0;
  const navItems = ADMIN_NAV.map((item) => (item.id === 'students' ? { ...item, count: students } : item));

  const headerExtra = (
    <span className="who">
      <b>{totals ? students + ' students · ' + totals.departments + ' depts' : '…'}</b>
    </span>
  );

  const sidebarFooter = (
    <>
      <div className="side-sep" />
      <SidebarTile item={{ id: 'refresh', ic: '🔄', lbl: 'Refresh data', ...theme.tiles.refresh }} active={false} onClick={refreshAll} />
      <div className="side-foot">Admin / TL</div>
    </>
  );

  const overlays = (
    <>
      {modal && <AdminModal modal={modal} onClose={() => setModal(null)} />}
      {perfStudent && <AdminPerformance student={perfStudent} onClose={() => setPerfStudent(null)} />}
      {browseChart && <AdminChartView chart={browseChart} onClose={() => setBrowseChart(null)} />}
      {notice && (
        <div className={'cvx-msg admin-notice ' + notice.tone} role={notice.tone === 'err' ? 'alert' : 'status'}>
          <span>{notice.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
    </>
  );

  return (
    <DashboardLayout
      session={session}
      onLogout={logout}
      headerExtra={headerExtra}
      navItems={navItems}
      sidebarFooter={sidebarFooter}
      overlays={overlays}
    />
  );
}

export function AdminLayout() {
  return (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  );
}

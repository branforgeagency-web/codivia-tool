/* CODIVIA platform — admin dashboard layout: header + sidebar menu + routed page + modals */
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx';
import { SidebarTile } from '../components/layout/Sidebar.jsx';
import { ADMIN_NAV } from '../config/navigation.js';
import { AdminProvider, useAdmin } from '../context/AdminContext.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { AdminModal } from '../pages/admin/components/AdminModal.jsx';
import { AdminChartView } from '../pages/admin/components/ChartViewModal.jsx';
import { AdminPerformance } from '../pages/admin/components/PerformanceModal.jsx';
import { theme } from '../theme/theme.js';
import { activeDeptKeys } from '../utils/allocation.js';

function AdminShell() {
  const { session, logout } = useSession();
  const {
    students,
    loadingStudents,
    refreshStudents,
    totalAllocated,
    totalPool,
    modal,
    setModal,
    allocate,
    allocateMany,
    addStudent,
    bulkAllocate,
    perfId,
    setPerfId,
    browseChart,
    setBrowseChart,
  } = useAdmin();

  const navItems = ADMIN_NAV.map((item) =>
    item.id === 'students' ? { ...item, count: students.length } : item,
  );

  const headerExtra = (
    <span className="who">
      <b>{students.length + ' students · ' + activeDeptKeys().length + ' depts'}</b>
    </span>
  );

  const sidebarFooter = (
    <>
      <div className="side-sep" />
      <SidebarTile
        item={{
          id: 'refresh',
          ic: '🔄',
          lbl: loadingStudents ? 'Loading…' : 'Refresh list',
          ...theme.tiles.refresh,
        }}
        active={false}
        onClick={refreshStudents}
      />
      <div className="side-foot">
        Admin / TL
        <br />
        {totalAllocated.toLocaleString() + ' of ' + totalPool.toLocaleString() + ' charts allocated'}
      </div>
    </>
  );

  const perfStudent = perfId ? students.find((s) => s.id === perfId) : null;
  const overlays = (
    <>
      {modal && (
        <AdminModal
          modal={modal}
          students={students}
          allocate={allocate}
          allocateMany={allocateMany}
          addStudent={addStudent}
          bulkAllocate={bulkAllocate}
          onClose={() => setModal(null)}
        />
      )}
      {perfStudent && <AdminPerformance student={perfStudent} onClose={() => setPerfId(null)} />}
      {browseChart && <AdminChartView chart={browseChart} onClose={() => setBrowseChart(null)} />}
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

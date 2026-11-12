import { RouteLoading } from '../components/ui/RouteLoading.jsx';
/* CODIVIA platform — routes per role. Pages are lazy-loaded: each one is downloaded
   the first time its route is opened. */
import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { StudentProvider } from '../context/StudentContext.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { StudentLayout } from '../layouts/StudentLayout.jsx';
import { PATHS, deptQueuePath } from './paths.js';

// student pages
const Dashboard = lazy(() => import('../pages/student/Dashboard.jsx'));
const MyCharts = lazy(() => import('../pages/student/MyCharts.jsx'));
const DeptQueue = lazy(() => import('../pages/student/DeptQueue.jsx'));
const Coder = lazy(() => import('../pages/student/coder/CoderPage.jsx'));
const Progress = lazy(() => import('../pages/student/Progress.jsx'));
const CodeSearch = lazy(() => import('../pages/student/CodeSearch.jsx'));
const CodingGuidelines = lazy(() => import('../pages/student/CodingGuidelines.jsx'));
const DrugReference = lazy(() => import('../pages/student/DrugReference.jsx'));
const Certificate = lazy(() => import('../pages/student/CertificatePage.jsx'));
const MyCertificates = lazy(() => import('../pages/student/MyCertificates.jsx'));
const ResumeBuilder = lazy(() => import('../pages/student/resume/ResumeBuilder.jsx'));
// admin pages
const AdminOverview = lazy(() => import('../pages/admin/Overview.jsx'));
const AdminDepartments = lazy(() => import('../pages/admin/Departments.jsx'));
const AdminCharts = lazy(() => import('../pages/admin/Charts.jsx'));
const AdminStudents = lazy(() => import('../pages/admin/Students.jsx'));
const AdminUpload = lazy(() => import('../pages/admin/Upload.jsx'));
// auditor
const AuditStation = lazy(() => import('../pages/auditor/AuditStation.jsx'));

// Where a student lands on "/" (or an old /app.html link). Old query links still work:
//   ?view=findcode -> Code Search,  ?dept=CARDIO -> that department's chart queue
function StudentHome() {
  const { session } = useSession();
  const { search } = useLocation();
  const stu = session.user;
  const p = new URLSearchParams(search);
  if (p.get('view') === 'findcode') return <Navigate to={PATHS.codeSearch} replace />;
  const d = p.get('dept');
  if (d && stu.depts && stu.depts[d] != null) {
    return <Navigate to={deptQueuePath(d)} replace />;
  }
  return <Navigate to={PATHS.dashboard} replace />;
}

function StudentRoutes() {
  return (
    <Routes>
      <Route element={<StudentProvider />}>
        <Route element={<StudentLayout />}>
          <Route path={PATHS.dashboard} element={<Dashboard />} />
          <Route path={PATHS.charts} element={<MyCharts />} />
          <Route path={PATHS.charts + '/:dept'} element={<DeptQueue />} />
          <Route path={PATHS.progress} element={<Progress />} />
          <Route path={PATHS.codeSearch} element={<CodeSearch />} />
          <Route path={PATHS.guidelines} element={<CodingGuidelines />} />
          <Route path={PATHS.drugReference} element={<DrugReference />} />
          <Route path={PATHS.certificate} element={<Certificate />} />
          <Route path={PATHS.myCertificates} element={<MyCertificates />} />
          <Route path={PATHS.resume} element={<ResumeBuilder />} />
        </Route>
        <Route path={PATHS.charts + '/:dept/:chartId'} element={<Coder />} />
        <Route path="*" element={<StudentHome />} />
      </Route>
    </Routes>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to={PATHS.adminOverview} replace />} />
        <Route path="overview" element={<AdminOverview />} />
        <Route path="departments" element={<AdminDepartments />} />
        <Route path="charts" element={<AdminCharts />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="upload" element={<AdminUpload />} />
      </Route>
      <Route path="*" element={<Navigate to={PATHS.adminOverview} replace />} />
    </Routes>
  );
}

function AuditorRoutes() {
  return (
    <Routes>
      <Route path={PATHS.auditor} element={<AuditStation />} />
      <Route path="*" element={<Navigate to={PATHS.auditor} replace />} />
    </Routes>
  );
}

export function AppRoutes() {
  const { session } = useSession();
  return (
    <Suspense fallback={<RouteLoading />}>
      {session.role === 'student' && <StudentRoutes />}
      {session.role === 'admin' && <AdminRoutes />}
      {session.role === 'auditor' && <AuditorRoutes />}
    </Suspense>
  );
}

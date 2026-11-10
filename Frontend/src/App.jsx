/* CODIVIA platform — App root: splash while starting, sign-in when signed out, otherwise the routes */
import { Splash } from './components/layout/Splash.jsx';
import { SessionProvider, useSession } from './context/SessionContext.jsx';
import { Login } from './pages/auth/Login.jsx';
import { AppRoutes } from './routes/AppRoutes.jsx';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PATHS } from './routes/paths.js';

function AppContent() {
  const { ready, session } = useSession();
  const location = useLocation();
  if (!ready) return <Splash />;
  const params = new URLSearchParams(location.search);
  const legacyAuth = params.get('login') === '1' || params.get('signup') === '1';
  return (
    <Routes>
      <Route path={PATHS.signIn} element={
        session ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="*" element={
        !session || legacyAuth
          ? <Navigate to={PATHS.signIn + location.search} replace />
          : <AppRoutes />
      } />
    </Routes>
  );
}

export function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

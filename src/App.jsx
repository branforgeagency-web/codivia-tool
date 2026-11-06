/* CODIVIA platform — App root: splash while starting, sign-in when signed out, otherwise the routes */
import { Splash } from './components/layout/Splash.jsx';
import { SessionProvider, useSession } from './context/SessionContext.jsx';
import { Login } from './pages/auth/Login.jsx';
import { AppRoutes } from './routes/AppRoutes.jsx';

function AppContent() {
  const { ready, session, setSession } = useSession();
  if (!ready) return <Splash />;
  if (!session) return <Login onLogin={setSession} />;
  return <AppRoutes />;
}

export function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

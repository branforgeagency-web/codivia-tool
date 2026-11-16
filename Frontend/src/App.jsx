/* CODIVIA platform — App root: splash while starting, sign-in when signed out, otherwise the routes.
   Fallbacks: a crash anywhere shows a recoverable error screen (never a blank page), an unreachable
   server at start shows "Can't reach CODIVIA — Retry" (instead of silently signing out), and bars
   report being offline or data that failed to load. */
import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Splash } from './components/layout/Splash.jsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';
import { SessionProvider, useSession } from './context/SessionContext.jsx';
import { useOnline } from './hooks/useOnline.js';
import { Login } from './pages/auth/Login.jsx';
import { AppRoutes } from './routes/AppRoutes.jsx';
import { PATHS } from './routes/paths.js';

function StatusBars() {
  const online = useOnline();
  const { session, reloadSession } = useSession();
  const [busy, setBusy] = useState(false);
  if (!online)
    return (
      <div className="cv-banner offline" role="status">
        You're offline. Changes can't be saved until the connection is back.
      </div>
    );
  const issues = (session && session.loadIssues) || [];
  if (!issues.length) return null;
  return (
    <div className="cv-banner degraded" role="status">
      Some data couldn't load ({issues.join(', ')}), so parts of the page may look empty.
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await reloadSession();
          } catch (e) {
            console.error('reload session', e);
          }
          setBusy(false);
        }}
      >
        {busy ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
}

function AppContent() {
  const { ready, session, bootError, retryBoot } = useSession();
  const location = useLocation();
  if (!ready) return <Splash />;
  if (bootError)
    return (
      <ErrorState
        variant="full"
        icon="📡"
        title="Can't reach CODIVIA"
        message="We couldn't connect to the server to restore your session. Check your internet connection and try again — you are still signed in."
        onRetry={retryBoot}
        actions={[{ label: 'Go to sign in', onClick: () => window.location.assign(PATHS.signIn) }]}
        details={import.meta.env.DEV ? bootError : undefined}
      />
    );
  const params = new URLSearchParams(location.search);
  const legacyAuth = params.get('login') === '1' || params.get('signup') === '1';
  return (
    <>
      <Routes>
        <Route path={PATHS.signIn} element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="*" element={!session || legacyAuth ? <Navigate to={PATHS.signIn + location.search} replace /> : <AppRoutes />} />
      </Routes>
      <StatusBars />
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary variant="full">
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </ErrorBoundary>
  );
}

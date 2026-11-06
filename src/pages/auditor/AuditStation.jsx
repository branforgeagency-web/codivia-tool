/* CODIVIA platform — auditor view */
import { Header } from '../../components/layout/Header.jsx';
import { useSession } from '../../context/SessionContext.jsx';

// route: /auditor
export default function AuditStation() {
  const { session, logout } = useSession();
  return (
    <>
      <Header session={session} onLogout={logout} />
      <div className="wrap">
        <div className="page-head">
          <h1>Audit Station</h1>
          <p>The software auto-scores every submission. Auditor spot-checks flagged charts here.</p>
        </div>
        <div className="card">
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
            Auto-scoring is handled by the platform. Spot-check queue appears here as students
            submit.
          </div>
        </div>
      </div>
    </>
  );
}

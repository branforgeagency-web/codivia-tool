/* CODIVIA platform — auditor layout: header + sidebar menu + routed page.
   The Audit Queue badge shows charts waiting for audit (GET /audits/summary, re-checked every minute). */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx';
import { AUDITOR_NAV } from '../config/navigation.js';
import { useSession } from '../context/SessionContext.jsx';
import { get } from '../services/apiHelper.js';
import { AUDIT_SUMMARY } from '../services/endpoints.js';

const POLL_MS = 60 * 1000;

export function AuditorLayout() {
  const { session, logout } = useSession();
  const { pathname } = useLocation();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      document.visibilityState === 'visible' &&
      get(AUDIT_SUMMARY)
        .then((s) => !cancelled && setPending(s.pending + s.draft))
        .catch(() => {});
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [pathname]); // also refreshed after every page change (e.g. back from a completed audit)

  const navItems = AUDITOR_NAV.map((item) => (item.id === 'queue' ? { ...item, count: pending } : item));
  const sidebarFooter = (
    <>
      <div className="side-sep" />
      <div className="side-foot">
        Auditor
        <br />
        {session.user.email}
      </div>
    </>
  );
  return <DashboardLayout session={session} onLogout={logout} navItems={navItems} sidebarFooter={sidebarFooter} />;
}

/* CODIVIA platform — student dashboard layout: header + sidebar menu + routed page */
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx';
import { CERT_THRESHOLD } from '../config/constants.js';
import { STUDENT_NAV } from '../config/navigation.js';
import { useSession } from '../context/SessionContext.jsx';
import { useStudent } from '../context/StudentContext.jsx';
import { PATHS } from '../routes/paths.js';


export function StudentLayout() {
  const { logout } = useSession();
  const { session, stu, stats, hasScore, codScore, demoCert, setDemoCert } = useStudent();
  const navigate = useNavigate();

  const navItems = STUDENT_NAV.map((item) => {
    if (item.id === 'charts') return { ...item, count: stats.totalWorked };
    if (item.id === 'certificate') return { ...item, locked: !stats.anyCertified };
    return item;
  });

  // const headerExtra = (
  //   <span className="who">
  //     {'CODIVIA Score '}
  //     <b>{hasScore ? codScore : '—'}</b>
  //   </span>
  // );

  const sidebarFooter = (
    <>
      <div className="side-score">
        <div className="n" style={hasScore ? null : { fontSize: 26, color: 'var(--muted)' }}>
          {hasScore ? codScore : 'Not yet'}
        </div>
        <div className="l">{hasScore ? 'CODIVIA Score' : 'Score starts after your first chart'}</div>
      </div>
      <div className="side-foot">
        {stu.id}
        <br />
        {'Certificate unlocks at ' + CERT_THRESHOLD + ' charts'}
        <button
          onClick={() => {
            setDemoCert((v) => !v);
            navigate(PATHS.certificate);
          }}
          style={{
            marginTop: 10,
            width: '100%',
            fontSize: 11,
            fontWeight: 700,
            padding: '7px 8px',
            borderRadius: 6,
            cursor: 'pointer',
            border: '1px solid ' + (demoCert ? 'var(--color-brand)' : 'var(--tone-e3bd5c)'),
            background: demoCert ? 'var(--color-brandLight)' : 'var(--tone-fff2cf)',
            color: demoCert ? 'var(--color-brandDark)' : 'var(--tone-9a6b12)',
          }}
        >
          {demoCert ? '✓ Preview ON — click to turn off' : '👁 Preview certificate'}
        </button>
      </div>
    </>
  );

  return (
    <DashboardLayout
      session={session}
      onLogout={logout}
      // headerExtra={headerExtra}
      navItems={navItems}
      sidebarFooter={sidebarFooter}
    />
  );
}

import { Certificate } from '../../components/certificate/Certificate.jsx';
import { CERT_THRESHOLD } from '../../config/constants.js';
import { useStudent } from '../../context/StudentContext.jsx';

export function CertificateView({ stu, stats }) {
  const certified = Object.entries(stats.perDept).filter(([, st]) => st.certified);
  if (certified.length === 0) {
    return (
      <div>
        <div className="page-head">
          <h1>Certificate</h1>
          <p>
            {'Your digital certificate generates automatically once you complete ' +
              CERT_THRESHOLD +
              ' charts in a department.'}
          </p>
        </div>
        <div className="card">
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🔒</div>
            <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
              No certificate yet
            </div>
            <div>
              {'Complete ' +
                CERT_THRESHOLD +
                ' charts in any department to unlock your certificate.'}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="page-head">
        <h1>Your Certificate</h1>
        <p>Auto-generated from your completed work. Download as PDF.</p>
      </div>
      {certified.map(([dk, st]) => (
        <Certificate key={dk} stu={stu} dept={dk} st={st} />
      ))}
    </div>
  );
}

// route: /certificate
export default function CertificatePage() {
  const { stu, stats } = useStudent();
  return <CertificateView stu={stu} stats={stats} />;
}

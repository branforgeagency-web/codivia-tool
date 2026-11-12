import { Certificate } from '../../components/certificate/Certificate.jsx';
import { CERT_THRESHOLD } from '../../config/constants.js';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { deptInfo, useDepartments } from '../../context/SessionContext.jsx';
import { useStudent } from '../../context/StudentContext.jsx';

export function CertificateView({ certificates, previewCertificate }) {
  const entries = previewCertificate ? [...certificates, previewCertificate] : certificates;
  if (entries.length === 0) {
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
        <p>Your issued certificates. Download a copy as PDF.</p>
      </div>
      {entries.map((certificate) => (
        <Certificate key={certificate.id} certificate={certificate} />
      ))}
    </div>
  );
}

// route: /certificate
export default function CertificatePage() {
  const {
    stu,
    certificates,
    certificateLoading,
    certificateError,
    reloadCertificates,
    certificatePreview,
  } = useStudent();
  const departments = useDepartments();

  if (certificateError) {
    return (
      <div className="page">
        <div className="cvx-msg err" role="alert">
          {certificateError}{' '}
          <button type="button" onClick={reloadCertificates}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (certificateLoading) return <PageLoader label="Loading your certificates" />;

  let previewCertificate = null;
  if (import.meta.env.DEV && certificatePreview) {
    const dept = Object.keys(stu.depts || {})[0];
    if (dept) {
      const info = deptInfo(departments, dept);
      previewCertificate = {
        id: 'test-preview',
        certificateNo: 'TEST PREVIEW — NOT ISSUED',
        studentName: stu.name,
        deptName: info.name,
        elements: info.elements || [],
        worked: CERT_THRESHOLD,
        avg: 94,
        issuedAt: new Date().toISOString(),
        isPreview: true,
      };
    }
  }

  return <CertificateView certificates={certificates} previewCertificate={previewCertificate} />;
}

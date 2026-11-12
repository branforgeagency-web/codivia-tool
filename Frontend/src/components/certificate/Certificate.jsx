import { brand } from '../../config/brand.js';
import { ELEMENT_LABELS } from '../../config/constants.js';
import { doPrint } from '../../utils/print.js';

export function Certificate({ certificate }) {
  const { certificateNo, studentName, deptName, elements, worked, avg, issuedAt, isPreview } = certificate;
  const issuedDate = new Date(issuedAt);
  const codeSetLabels = (elements || []).map((element) => ELEMENT_LABELS[element] || element);
  const codeSets = codeSetLabels.join(', ');
  return (
    <div className="print-area" style={{ marginBottom: 16 }}>
      <div
        className="cert-body"
        style={{ background: 'var(--color-ink)', borderRadius: 14, padding: '30px 34px', color: 'var(--color-white)' }}
      >
        {isPreview && (
          <div
            style={{
              marginBottom: 12,
              padding: '6px 10px',
              border: '1px solid var(--tone-e3bd5c)',
              borderRadius: 6,
              color: 'var(--tone-fff2cf)',
              fontSize: 11,
              fontWeight: 800,
              textAlign: 'center',
            }}
          >
            TEST PREVIEW — NOT AN ISSUED CERTIFICATE
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
          <img src={brand.logo} style={{ height: 34 }} />
          <div>
            <div style={{ fontWeight: 900, letterSpacing: 2, fontSize: 17 }}>CODIVIA</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'var(--color-brand)', fontWeight: 700 }}>
              CODE · VALIDATE · GET HIRED
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--tone-8fa3ba)' }}>Certificate ID</div>
            <div style={{ fontSize: 12, fontFamily: 'monospace' }}>{certificateNo}</div>
          </div>
        </div>
        <div
          style={{ fontSize: 11, letterSpacing: 1, color: 'var(--color-brand)', textTransform: 'uppercase' }}
        >
          Certificate of Coding Proficiency
        </div>
        <div style={{ fontSize: 27, fontWeight: 900, margin: '8px 0 5px' }}>{studentName}</div>
        <div style={{ fontSize: 13, color: 'var(--tone-cdd9e5)', lineHeight: 1.6 }}>
          {'has successfully processed '}
          <b style={{ color: 'var(--color-white)' }}>{worked + ' ' + deptName + ' charts'}</b>
          {' on the CODIVIA live coding platform, demonstrating proficiency in ' + (codeSets || 'medical coding') + '.'}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 34,
            marginTop: 22,
            paddingTop: 18,
            borderTop: '1px solid rgba(255,255,255,.15)',
          }}
        >
          <CertStat n={worked} l="Charts processed" c="var(--color-brand)" />
          <CertStat n={avg + '%'} l="Average accuracy" c="var(--color-brand)" />
          <CertStat
            n={codeSetLabels.join(' · ')}
            l="Code sets"
            c="var(--color-gold)"
          />
          <div style={{ marginLeft: 'auto', textAlign: 'right', alignSelf: 'flex-end' }}>
            <div style={{ fontSize: 11, color: 'var(--tone-8fa3ba)' }}>Issued</div>
            <div style={{ fontSize: 12 }}>
              {issuedDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
        <button className="btn btn-teal" onClick={doPrint}>
          ⬇ Download PDF
        </button>
      </div>
    </div>
  );
}

export function CertStat({ n, l, c }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 900, color: c }}>{n}</div>
      <div
        style={{ fontSize: 10, color: 'var(--tone-8fa3ba)', textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {l}
      </div>
    </div>
  );
}

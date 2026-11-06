import { brand } from '../../config/brand.js';
import { DEPTS, ELEMENT_LABELS } from '../../config/constants.js';
import { doPrint } from '../../utils/print.js';

export function Certificate({ stu, dept, st }) {
  const d = DEPTS[dept];
  const certId = 'CDV-2026-' + String(1000 + parseInt(stu.id.replace(/\D/g, ''))).padStart(6, '0');
  return (
    <div className="print-area" style={{ marginBottom: 16 }}>
      <div
        className="cert-body"
        style={{ background: 'var(--color-ink)', borderRadius: 14, padding: '30px 34px', color: 'var(--color-white)' }}
      >
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
            <div style={{ fontSize: 12, fontFamily: 'monospace' }}>{certId}</div>
          </div>
        </div>
        <div
          style={{ fontSize: 11, letterSpacing: 1, color: 'var(--color-brand)', textTransform: 'uppercase' }}
        >
          Certificate of Coding Proficiency
        </div>
        <div style={{ fontSize: 27, fontWeight: 900, margin: '8px 0 5px' }}>{stu.name}</div>
        <div style={{ fontSize: 13, color: 'var(--tone-cdd9e5)', lineHeight: 1.6 }}>
          {'has successfully processed '}
          <b style={{ color: 'var(--color-white)' }}>{st.worked + ' ' + d.name + ' charts'}</b>
          {
            ' on the CODIVIA live coding platform, demonstrating production-ready proficiency in ICD-10-CM, CPT, and HCPCS.'
          }
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
          <CertStat n={st.worked} l="Charts processed" c="var(--color-brand)" />
          <CertStat n={st.avg + '%'} l="Average accuracy" c="var(--color-brand)" />
          <CertStat
            n={(d.elements || []).map((x) => ELEMENT_LABELS[x] || x).join(' · ')}
            l="Code sets"
            c="var(--color-gold)"
          />
          <div style={{ marginLeft: 'auto', textAlign: 'right', alignSelf: 'flex-end' }}>
            <div style={{ fontSize: 11, color: 'var(--tone-8fa3ba)' }}>Issued</div>
            <div style={{ fontSize: 12 }}>
              {new Date().toLocaleDateString('en-GB', {
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

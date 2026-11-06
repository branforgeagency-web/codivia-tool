import React from 'react';

// ---- Coding Guidelines reference (educational reference, 2026 CPT/IPPS principles) ----
export function GuidelinesPanel() {
  const [tab, setTab] = React.useState('em');
  const tabs = [
    ['em', 'E/M MDM Levels'],
    ['ed', 'ED Levels (99281-99285)'],
    ['ip', 'Inpatient / DRG Basics'],
  ];
  const th = {
    textAlign: 'left',
    padding: '8px 10px',
    fontSize: 12,
    color: 'var(--muted)',
    borderBottom: '1px solid var(--line)',
    fontWeight: 700,
  };
  const td = {
    padding: '8px 10px',
    fontSize: 12.5,
    borderBottom: '1px solid var(--line)',
    verticalAlign: 'top',
  };
  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div
        className="card-h"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h3>📋 Coding Guidelines Reference</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tabs.map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: '5px 11px',
                fontSize: 11.5,
                borderRadius: 7,
                cursor: 'pointer',
                border: '1px solid var(--line)',
                background: tab === id ? 'var(--teal)' : 'transparent',
                color: tab === id ? 'var(--color-white)' : 'var(--muted)',
                fontWeight: 600,
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {tab === 'em' && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0, marginBottom: 12 }}>
              2026 CPT E/M leveling is driven by Medical Decision Making (MDM) — the highest 2 of 3
              elements below set the level.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>MDM Level</th>
                  <th style={th}>Problems Addressed</th>
                  <th style={th}>Data Reviewed</th>
                  <th style={th}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    'Straightforward',
                    '1 self-limited / minor problem',
                    'Minimal or none',
                    'Minimal',
                  ],
                  [
                    'Low',
                    '2+ self-limited; or 1 stable chronic; or 1 acute uncomplicated',
                    'Limited (1-2 tests; review of prior notes)',
                    'Low',
                  ],
                  [
                    'Moderate',
                    '1 chronic w/ exacerbation; or 1 acute w/ systemic symptoms; or 1 undiagnosed new problem',
                    'Moderate (3+ tests; independent interpretation; external discussion)',
                    'Moderate (Rx management; minor surgery w/ risk factors)',
                  ],
                  [
                    'High',
                    '1 chronic w/ severe exacerbation; or acute illness/injury threatening life or bodily function',
                    'Extensive (multiple tests; independent interpretation; external consult)',
                    'High (drug therapy needing intensive monitoring; hospitalization; emergency major surgery)',
                  ],
                ].map((r, idx) => (
                  <tr key={idx}>
                    {r.map((c, ci) => (
                      <td
                        key={ci}
                        style={Object.assign(
                          {},
                          td,
                          ci === 0
                            ? { fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }
                            : {},
                        )}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'ed' && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0, marginBottom: 12 }}>
              Emergency Department E/M (99281-99285). No new vs established distinction; level is
              set by MDM complexity.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Code</th>
                  <th style={th}>MDM</th>
                  <th style={th}>Typical presentation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    '99281',
                    'N/A (may not require physician)',
                    'Nurse-only visit; minimal presenting problem',
                  ],
                  [
                    '99282',
                    'Low',
                    'Minor / self-limited — simple sprain, minor laceration, allergy, localized edema',
                  ],
                  [
                    '99283',
                    'Low-to-Moderate',
                    'Acute uncomplicated — bronchitis, URI, fever, uncomplicated headache, N/V',
                  ],
                  [
                    '99284',
                    'Moderate',
                    'Acute w/ systemic symptoms or workup — asthma exacerbation, chest pain, renal colic, cellulitis, fracture',
                  ],
                  [
                    '99285',
                    'High',
                    'Life/limb threat — appendicitis, stroke, status asthmaticus, syncope, sepsis, altered mental status',
                  ],
                ].map((r, idx) => (
                  <tr key={idx}>
                    {r.map((c, ci) => (
                      <td
                        key={ci}
                        style={Object.assign(
                          {},
                          td,
                          ci === 0
                            ? { fontWeight: 700, color: 'var(--teal)', whiteSpace: 'nowrap' }
                            : {},
                        )}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'ip' && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0, marginBottom: 12 }}>
              Inpatient facility coding uses ICD-10-CM (diagnoses) + ICD-10-PCS (procedures),
              grouped to an MS-DRG for payment.
            </p>
            <ul style={{ fontSize: 12.5, lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
              <li>
                <b>{'Principal Diagnosis: '}</b>the condition established after study to be chiefly
                responsible for the admission (UHDDS definition).
              </li>
              <li>
                <b>{'Secondary Dx / CC / MCC: '}</b>comorbidities and complications. A CC
                (Complication/Comorbidity) or MCC (Major CC) can shift the DRG to a higher-weighted
                tier.
              </li>
              <li>
                <b>{'ICD-10-PCS: '}</b>7-character codes for inpatient procedures — Section, Body
                System, Root Operation, Body Part, Approach, Device, Qualifier.
              </li>
              <li>
                <b>{'MS-DRG: '}</b>each inpatient stay maps to one Medicare Severity DRG based on
                principal dx, procedures, and CC/MCC level; the DRG weight drives reimbursement.
              </li>
              <li>
                <b>{'POA: '}</b>Present-On-Admission indicators are required on inpatient diagnoses
                and affect CC/MCC capture.
              </li>
            </ul>
          </div>
        )}
        <p
          style={{
            fontSize: 10.5,
            color: 'var(--muted)',
            marginTop: 14,
            marginBottom: 0,
            fontStyle: 'italic',
          }}
        >
          Educational reference summarizing 2026 CPT and CMS IPPS coding principles. Always verify
          against current official AMA CPT and CMS/ICD-10 guidelines for production coding.
        </p>
      </div>
    </div>
  );
}

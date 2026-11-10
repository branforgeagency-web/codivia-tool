import React from 'react';

// ---- Coding Guidelines reference (educational reference, 2026 CPT/IPPS principles) ----
// Styles: .gl-* in styles/refinements.css

const Icon = ({ d, size = 18 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={true}
  >
    <path d={d} />
  </svg>
);

const ICONS = {
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5A2.5 2.5 0 0 1 4 18.5M9 7h7M9 11h5',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  shield: 'M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6zM9 12l2 2 4-4',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  layers: 'm12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5',
  hash: 'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18',
  scale: 'M12 3v18M5 7h14M5 7l-3 7a4 4 0 0 0 6 0zM19 7l-3 7a4 4 0 0 0 6 0zM8 21h8',
  flag: 'M4 22V4s1.5-1 5-1 5 2 8 2 3-.5 3-.5v11s-1 .5-3 .5-5-2-8-2-5 1-5 1',
};

const TABS = [
  ['em', 'E/M MDM Levels'],
  ['ed', 'ED Levels (99281-99285)'],
  ['ip', 'Inpatient / DRG Basics'],
];

// level → badge colour
const LEVEL_TONE = {
  'N/A (may not require physician)': 'mute',
  Straightforward: 'ok',
  Low: 'low',
  'Low-to-Moderate': 'mid',
  Moderate: 'mod',
  High: 'high',
};

const EM_ROWS = [
  ['Straightforward', '1 self-limited / minor problem', 'Minimal or none', 'Minimal'],
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
];

const ED_ROWS = [
  ['99281', 'N/A (may not require physician)', 'Nurse-only visit; minimal presenting problem'],
  ['99282', 'Low', 'Minor / self-limited — simple sprain, minor laceration, allergy, localized edema'],
  ['99283', 'Low-to-Moderate', 'Acute uncomplicated — bronchitis, URI, fever, uncomplicated headache, N/V'],
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
];

const IP_ITEMS = [
  [
    'target',
    'Principal Diagnosis',
    'The condition established after study to be chiefly responsible for the admission (UHDDS definition).',
  ],
  [
    'layers',
    'Secondary Dx / CC / MCC',
    'Comorbidities and complications. A CC (Complication/Comorbidity) or MCC (Major CC) can shift the DRG to a higher-weighted tier.',
  ],
  [
    'hash',
    'ICD-10-PCS',
    '7-character codes for inpatient procedures — Section, Body System, Root Operation, Body Part, Approach, Device, Qualifier.',
  ],
  [
    'scale',
    'MS-DRG',
    'Each inpatient stay maps to one Medicare Severity DRG based on principal dx, procedures, and CC/MCC level; the DRG weight drives reimbursement.',
  ],
  [
    'flag',
    'POA',
    'Present-On-Admission indicators are required on inpatient diagnoses and affect CC/MCC capture.',
  ],
];

const INTRO = {
  em: '2026 CPT E/M leveling is driven by Medical Decision Making (MDM) — the highest 2 of 3 elements below set the level.',
  ed: 'Emergency Department E/M (99281-99285). No new vs established distinction; level is set by MDM complexity.',
  ip: 'Inpatient facility coding uses ICD-10-CM (diagnoses) + ICD-10-PCS (procedures), grouped to an MS-DRG for payment.',
};

const Level = ({ children }) => (
  <span className={'gl-level ' + (LEVEL_TONE[children] || 'mute')}>{children}</span>
);

export function GuidelinesPanel() {
  const [tab, setTab] = React.useState('em');
  return (
    <section className="gl card">
      <div className="gl-head">
        <div className="gl-title">
          <span className="gl-ico">
            <Icon d={ICONS.book} size={20} />
          </span>
          <div>
            <h3>Coding Guidelines Reference</h3>
            <p>Quick reference for E/M, ED and inpatient coding · 2026</p>
          </div>
        </div>
        <div className="gl-tabs" role="tablist" aria-label="Guideline topics">
          {TABS.map(([id, lbl]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'on' : ''}
              onClick={() => setTab(id)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="gl-body" role="tabpanel">
        <div className="gl-intro">
          <Icon d={ICONS.info} />
          <span>{INTRO[tab]}</span>
        </div>

        {tab === 'em' && (
          <div className="gl-table-wrap">
            <table className="gl-table">
              <thead>
                <tr>
                  <th>MDM Level</th>
                  <th>Problems Addressed</th>
                  <th>Data Reviewed</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {EM_ROWS.map(([level, ...cells]) => (
                  <tr key={level}>
                    <td>
                      <Level>{level}</Level>
                    </td>
                    {cells.map((c, i) => (
                      <td key={i}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'ed' && (
          <div className="gl-table-wrap">
            <table className="gl-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>MDM</th>
                  <th>Typical presentation</th>
                </tr>
              </thead>
              <tbody>
                {ED_ROWS.map(([code, mdm, text]) => (
                  <tr key={code}>
                    <td>
                      <span className="gl-code">{code}</span>
                    </td>
                    <td>
                      <Level>{mdm}</Level>
                    </td>
                    <td>{text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'ip' && (
          <div className="gl-grid">
            {IP_ITEMS.map(([ico, title, text]) => (
              <div className="gl-item" key={title}>
                <span className="gl-item-ico">
                  <Icon d={ICONS[ico]} />
                </span>
                <div>
                  <b>{title}</b>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="gl-note">
          <Icon d={ICONS.shield} size={15} />
          Educational reference summarizing 2026 CPT and CMS IPPS coding principles. Always verify
          against current official AMA CPT and CMS/ICD-10 guidelines for production coding.
        </div>
      </div>
    </section>
  );
}

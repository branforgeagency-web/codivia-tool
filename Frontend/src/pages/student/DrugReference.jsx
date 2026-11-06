import React from 'react';
import { loadB64Json, loadFdaNdc } from '../../services/codeDb.js';
import { useStudent } from '../../context/StudentContext.jsx';

// ---- Drug Reference: substance -> how it is coded ------------------------
// Built from the CMS Table of Drugs and Chemicals plus HCPCS J codes.
// It answers the questions a coder actually has: is an adverse effect even
// possible for this substance, which poisoning column applies, and is there
// a HCPCS code for administering it.
export function DrugReference({ codeDB, dbStatus }) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(null);
  const [TBL, setTBL] = React.useState(window.ICD_DRUG || null);
  const [NDC, setNDC] = React.useState(window.FDA_NDC || null);

  React.useEffect(() => {
    if (window.ICD_DRUG) {
      setTBL(window.ICD_DRUG);
      return;
    }
    let live = true;
    loadB64Json('ICD_DRUG_B64', 'ICD_DRUG')
      .then((d) => {
        if (live) setTBL(d);
      })
      .catch(() => {});
    loadFdaNdc()
      .then((d) => {
        if (live && d) setNDC(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // Legal status for the selected substance, from the FDA NDC directory.
  // Returns null when the dataset is not loaded — we never guess.
  const legalStatus = React.useMemo(() => {
    if (!NDC || !sel) return null;
    const name = sel.t.split('(')[0].trim().toLowerCase();
    if (name.length < 4) return null;
    const hit = NDC[name] || NDC[name.replace(/[^a-z]/g, '')];
    return hit || null;
  }, [NDC, sel]);

  const ql = q.trim().toLowerCase();
  const rows = React.useMemo(() => {
    if (!TBL || ql.length < 2) return [];
    // exact name first, then prefix, then contains. Duplicate names are collapsed
    // so the same substance is not listed three times.
    const exact = [],
      starts = [],
      contains = [];
    const seen = {};
    for (let i = 0; i < TBL.length; i++) {
      const row = TBL[i];
      const t = row.t.trim().toLowerCase();
      if (seen[t]) continue;
      if (t === ql) {
        seen[t] = 1;
        exact.push(row);
      } else if (t.indexOf(ql) === 0) {
        seen[t] = 1;
        starts.push(row);
      } else if (t.indexOf(ql) !== -1) {
        seen[t] = 1;
        contains.push(row);
      }
    }
    return exact.concat(starts, contains).slice(0, 120);
  }, [TBL, ql]);

  // HCPCS J codes matching the substance name
  const jcodes = React.useMemo(() => {
    if (!codeDB || !sel) return [];
    const name = sel.t.split('(')[0].trim().toLowerCase();
    if (name.length < 4) return [];
    const out = [];
    for (let i = 0; i < codeDB.length; i++) {
      const r = codeDB[i];
      if (r[0] !== 3) continue;
      if (r[2].charAt(0) !== 'J') continue; // drug products only, not G/A service codes
      if (r[3].toLowerCase().indexOf(name) !== -1) out.push(r);
      if (out.length >= 12) break;
    }
    return out;
  }, [codeDB, sel]);

  const COLS = [
    { k: 'Poisoning, accidental', i: 0, c: 'var(--tone-b4232a)' },
    { k: 'Poisoning, self-harm', i: 1, c: 'var(--tone-8b2e6b)' },
    { k: 'Poisoning, assault', i: 2, c: 'var(--tone-c4562a)' },
    { k: 'Poisoning, undetermined', i: 3, c: 'var(--tone-7a6a2e)' },
    { k: 'Adverse effect', i: 4, c: 'var(--tone-0e7c66)' },
    { k: 'Underdosing', i: 5, c: 'var(--tone-5a6472)' },
  ];

  const detail = () => {
    if (!sel) return null;
    const therapeutic = !!sel.c[4];
    return (
      <div
        style={{
          background: 'var(--color-white)',
          border: '2px solid var(--teal)',
          borderRadius: 12,
          padding: '16px 18px',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--navy)', marginBottom: 8 }}>
          {sel.t}
        </div>
        <div
          style={{
            background: therapeutic ? 'var(--tone-eefaf8)' : 'var(--tone-fdeeee)',
            border: '1px solid ' + (therapeutic ? 'var(--tone-bfe6dd)' : 'var(--tone-f3c9c9)'),
            borderRadius: 8,
            padding: '10px 13px',
            marginBottom: 12,
            fontSize: 12.5,
            lineHeight: 1.6,
          }}
        >
          {therapeutic ? (
            <span>
              <b>{'Has a therapeutic use. '}</b>
              {'An '}
              <b>adverse effect</b>
              {
                ' code is available for this substance \u2014 use it when the drug was correctly prescribed and correctly taken. If it was taken incorrectly, overdosed, or combined with alcohol, that is a '
              }
              <b>poisoning</b>
              {' instead.'}
            </span>
          ) : (
            <span>
              <b>{'No therapeutic use recorded. '}</b>The Table gives no adverse-effect column for
              this substance, so an adverse effect code does not apply. Code it as a poisoning or
              toxic effect according to intent.
            </span>
          )}
        </div>
        {(function () {
          // Drug class derived from the substance's own poisoning code. This is a
          // property of the ICD classification, not a clinical inference.
          const CLS = {
            'T40.0': 'Opium',
            'T40.1': 'Heroin',
            'T40.2': 'Opioid analgesic',
            'T40.3': 'Methadone',
            'T40.4': 'Synthetic narcotic',
            'T40.5': 'Cocaine',
            'T40.6': 'Narcotic',
            'T40.7': 'Cannabis',
            'T42.4': 'Benzodiazepine',
            'T43.6': 'Psychostimulant',
          };
          const p0 = (sel.c[0] || '').slice(0, 5);
          const label = CLS[p0];
          if (!label) return null;
          return (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--muted)',
                  letterSpacing: 0.5,
                  marginBottom: 7,
                }}
              >
                DRUG CLASS
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  padding: '10px 13px',
                  borderRadius: 8,
                  background: 'var(--tone-fff8ec)',
                  border: '1px solid var(--tone-f0d9a8)',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--color-white)',
                    background: 'var(--tone-9a6b12)',
                    borderRadius: 5,
                    padding: '3px 10px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label.toUpperCase()}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--ink)', lineHeight: 1.55, flex: 1 }}>
                  {'Classified here by its poisoning code prefix '}
                  <b style={{ fontFamily: "'SF Mono',monospace" }}>{p0}</b>. Substances in this
                  group are commonly controlled — check the documented intent carefully, since
                  accidental, self-harm, assault and undetermined each take a different code.
                </span>
              </div>
            </div>
          );
        })()}
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--muted)',
            letterSpacing: 0.5,
            marginBottom: 7,
          }}
        >
          LEGAL STATUS — PRESCRIPTION OR OTC
        </div>
        {legalStatus ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 12,
              padding: '10px 13px',
              borderRadius: 8,
              background: legalStatus.rx ? 'var(--tone-f5f1fc)' : 'var(--tone-eefaf8)',
              border: '1px solid ' + (legalStatus.rx ? 'var(--tone-ded2f2)' : 'var(--tone-bfe6dd)'),
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--color-white)',
                borderRadius: 5,
                padding: '3px 10px',
                background: legalStatus.rx ? 'var(--tone-7a5ab8)' : 'var(--tone-0e7c66)',
              }}
            >
              {legalStatus.rx ? '\u211e PRESCRIPTION' : 'OTC \u2014 OVER THE COUNTER'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink)' }}>{legalStatus.category || ''}</span>
            {legalStatus.rx ? (
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                A prescription drug taken as directed can produce an adverse effect; taken
                incorrectly it is a poisoning.
              </span>
            ) : (
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                Available without a prescription — patients frequently self-medicate, so check the
                documented dose against label directions.
              </span>
            )}
          </div>
        ) : jcodes.length > 0 ? (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 13px',
              borderRadius: 8,
              background: 'var(--tone-f5f1fc)',
              border: '1px solid var(--tone-ded2f2)',
              fontSize: 12,
              color: 'var(--ink)',
              lineHeight: 1.6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--color-white)',
                background: 'var(--tone-7a5ab8)',
                borderRadius: 5,
                padding: '3px 10px',
                marginRight: 8,
              }}
            >
              PROVIDER-ADMINISTERED
            </span>
            {
              'An injectable or infused form of this substance exists and carries a HCPCS J code, so that form is supplied and administered by a provider. Report the J code with the administration CPT code. '
            }
            <b>{'Other forms of the same drug may be oral or over the counter '}</b>— code from the
            route and dose actually documented, not from the substance name.
          </div>
        ) : (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 13px',
              borderRadius: 8,
              background: 'var(--tone-f4f6f8)',
              border: '1px solid var(--tone-dfe4ea)',
              fontSize: 12,
              color: 'var(--ink)',
              lineHeight: 1.6,
            }}
          >
            <b>{'Not determinable from coding data. '}</b>
            {
              'Neither the Table of Drugs nor HCPCS records whether this substance is prescription-only or sold over the counter, and CODIVIA will not guess \u2014 that is a clinical fact. '
            }
            <b>{'What matters for your code is not the legal status but the documentation: '}</b>if
            the drug was correctly prescribed and correctly taken, code the adverse effect; if it
            was taken incorrectly, overdosed, or combined with alcohol, code the poisoning. An OTC
            drug taken beyond label directions is still a poisoning.
          </div>
        )}
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--muted)',
            letterSpacing: 0.5,
            marginBottom: 7,
          }}
        >
          TABLE OF DRUGS AND CHEMICALS
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {COLS.map((col, ci) => {
            const v = sel.c[col.i];
            if (!v)
              return (
                <span
                  key={ci}
                  style={{
                    fontSize: 10.5,
                    color: 'var(--tone-c3c8cf)',
                    border: '1px dashed var(--line)',
                    borderRadius: 5,
                    padding: '4px 9px',
                  }}
                >
                  {col.k + ': \u2014'}
                </span>
              );
            return (
              <span
                key={ci}
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  borderRadius: 5,
                  padding: '4px 9px',
                  border: '1px solid ' + col.c,
                  color: col.c,
                  background: 'var(--color-white)',
                }}
              >
                {col.k + ': '}
                <span style={{ fontFamily: "'SF Mono',monospace", fontWeight: 800 }}>{v}</span>
              </span>
            );
          })}
        </div>
        {jcodes.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--muted)',
                letterSpacing: 0.5,
                marginBottom: 7,
              }}
            >
              HCPCS J CODES — for the drug product when administered
            </div>
            <div
              style={{
                maxHeight: 180,
                overflowY: 'auto',
                border: '1px solid var(--line)',
                borderRadius: 8,
              }}
            >
              {jcodes.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '7px 11px',
                    borderBottom: i < jcodes.length - 1 ? '1px solid var(--line-soft)' : 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: 'var(--navy)',
                      fontFamily: "'SF Mono',monospace",
                      minWidth: 62,
                    }}
                  >
                    {r[2]}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--ink)', flex: 1, lineHeight: 1.4 }}>
                    {r[3]}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 7, lineHeight: 1.55 }}>
              {'Read the descriptor for the '}
              <b>unit</b>
              {
                ' \u2014 per mg, per 10 mg or per vial \u2014 and calculate units from the dose documented, not the vial size. Report the administration CPT code as well.'
              }
            </div>
          </div>
        )}
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            marginTop: 12,
            lineHeight: 1.55,
            borderTop: '1px solid var(--line-soft)',
            paddingTop: 10,
          }}
        >
          {'Sequencing reminder: for a '}
          <b>poisoning</b>
          {', the poisoning code comes first, then the manifestation. For an '}
          <b>adverse effect</b>
          {', the manifestation comes first, then the T code. '}
          <b>Underdosing</b>
          {' is never a principal diagnosis.'}
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Drug Reference</h1>
        <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
          Look up a substance to see how it is coded — whether an adverse effect applies, which
          poisoning column fits the documented intent, and the HCPCS code for the product.
        </p>
      </div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          value={q}
          onChange={(ev) => {
            setQ(ev.target.value);
            setSel(null);
          }}
          placeholder={
            TBL
              ? 'Search a drug or chemical \u2014 e.g. acetaminophen, insulin, warfarin\u2026'
              : 'Loading drug table\u2026'
          }
          style={{
            width: '100%',
            padding: '12px 15px',
            fontSize: 14.5,
            border: '1px solid var(--line)',
            borderRadius: 10,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: 14,
            top: 13,
            fontSize: 11,
            color: TBL ? 'var(--ok)' : 'var(--mod)',
          }}
        >
          {TBL ? TBL.length.toLocaleString() + ' substances' : 'loading\u2026'}
        </span>
      </div>
      {detail()}
      <div
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {ql.length < 2 ? (
          <div
            style={{
              padding: '34px 20px',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 13.5,
            }}
          >
            Type at least two characters to search the Table of Drugs and Chemicals.
          </div>
        ) : rows.length === 0 ? (
          <div
            style={{
              padding: '34px 20px',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 13.5,
            }}
          >
            No substance matches that term.
          </div>
        ) : (
          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
            {rows.map((r, i) => (
              <div
                key={i}
                onClick={() => setSel(r)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '10px 15px',
                  cursor: 'pointer',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 'none',
                  background: sel && sel === r ? 'var(--tone-eef4fb)' : 'var(--color-white)',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--ink)',
                    flex: 1,
                    paddingLeft: Math.min(r.l, 4) * 12,
                  }}
                >
                  {r.t}
                </span>
                {r.c[4] ? (
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      color: 'var(--tone-0e7c66)',
                      background: 'var(--tone-eefaf8)',
                      border: '1px solid var(--tone-bfe6dd)',
                      borderRadius: 4,
                      padding: '2px 7px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    THERAPEUTIC
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      color: 'var(--tone-b4232a)',
                      background: 'var(--tone-fdeeee)',
                      border: '1px solid var(--tone-f3c9c9)',
                      borderRadius: 4,
                      padding: '2px 7px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    NO ADVERSE EFFECT
                  </span>
                )}
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "'SF Mono',monospace",
                    color: 'var(--muted)',
                    minWidth: 64,
                  }}
                >
                  {r.c[0] || '\u2014'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, lineHeight: 1.6 }}>
        {
          'Source: official CMS ICD-10-CM Table of Drugs and Chemicals FY2026 and the HCPCS Level II code set. This is a '
        }
        <b>coding</b>
        {
          ' reference. It does not carry dosing, interactions or contraindications, and is not a clinical drug database. Prescription/OTC status requires the free FDA National Drug Code directory \u2014 upload '
        }
        <b>ndctext.zip</b>
        {' from accessdata.fda.gov and it will appear against every substance.'}
      </div>
    </div>
  );
}

// route: /drug-reference
export default function DrugReferencePage() {
  const { codeDB, dbStatus } = useStudent();
  return <DrugReference codeDB={codeDB} dbStatus={dbStatus} />;
}

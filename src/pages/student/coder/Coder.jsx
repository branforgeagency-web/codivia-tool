import { useState } from 'react';
import { DEPTS } from '../../../config/constants.js';
import { CodeSection } from './CodeSection.jsx';
import { FloatingLookup } from './FloatingLookup.jsx';
import { RecordTabs } from './RecordTabs.jsx';
import { ResultModal } from './ResultModal.jsx';
import { DRG_OPTIONS } from './constants.js';
import { chartHeaderFields } from './recordSections.js';
import { openCodeSearchWindow } from '../../../utils/codeSearchWindow.js';

export function Coder({ chart, codeDB, dbStatus, onClose, onSubmit, saveState }) {
  const isIP = chart.dept === 'IP' || !!chart.isInpatient;
  const isHH = chart.dept === 'HH'; // Home Health: ICD-10-CM diagnoses only (PDGM), no E/M or CPT
  // Level of Service (E/M) is only valid where the department actually bills an
  // E/M service. Procedural / technical departments (IVR, RAD, PATH, DME, ENT,
  // GENSURG) code the procedure only — showing an E/M box there teaches students
  // to unbundle. DEPTS[].elements is the source of truth; 'EM' must be listed.
  const deptEls = (DEPTS[chart.dept] && DEPTS[chart.dept].elements) || [];
  const hasEM = deptEls.indexOf('EM') !== -1;
  const [dx, setDx] = useState([{ code: '', desc: '' }]); // Principal dx (IP) / Diagnoses (OP)
  const [sdx, setSdx] = useState([{ code: '', desc: '' }]); // Secondary diagnoses (IP)
  const [pcs, setPcs] = useState([{ code: '', desc: '' }]); // Principal procedure ICD-10-PCS (IP)
  const [spcs, setSpcs] = useState([{ code: '', desc: '' }]); // Secondary procedures ICD-10-PCS (IP)
  const [cpt, setCpt] = useState([{ code: '', desc: '' }]); // CPT/HCPCS
  const [em, setEm] = useState([{ code: '', desc: '' }]); // E/M level of service
  const [drg, setDrg] = useState(''); // MS-DRG (inpatient only)
  const [lookupOpen, setLookupOpen] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  // Prefer a real browser window. If the browser blocks popups, fall back to
  // the in-page floating panel so the coder is never left with nothing.
  const openLookup = () => {
    const win = openCodeSearchWindow();
    if (win) {
      setPopupBlocked(false);
      return;
    }
    setPopupBlocked(true);
    setLookupOpen(true);
  };
  // Insert a code picked in the floating lookup straight into the matching
  // section, so the coder never types the same query twice.
  const insertFromLookup = (row) => {
    const sys = row[0],
      code = row[2],
      desc = row[3];
    const addTo = (rows, setRows) => {
      const blank = rows.findIndex((r) => !r.code);
      const next = rows.slice();
      if (blank >= 0) next[blank] = Object.assign({}, next[blank], { code, desc });
      else next.push({ code, desc });
      setRows(next);
    };
    if (sys === 0) {
      // ICD-10-CM
      if (isIP && dx[0] && dx[0].code) addTo(sdx, setSdx);
      else addTo(dx, setDx);
    } else if (sys === 1) {
      // ICD-10-PCS
      if (isIP && pcs[0] && pcs[0].code) addTo(spcs, setSpcs);
      else addTo(pcs, setPcs);
    } else if (/^99[2-4]\d\d$/.test(code)) {
      // E/M level
      addTo(em, setEm);
    } else {
      // CPT / HCPCS
      addTo(cpt, setCpt);
    }
  };
  const [drgSearch, setDrgSearch] = useState('');
  const [drgOpen, setDrgOpen] = useState(false);
  const [result, setResult] = useState(null);

  const submit = () => {
    const norm = (s) => (s || '').toUpperCase().replace(/[\s.]/g, '');
    const allRows = [...dx, ...sdx, ...pcs, ...spcs, ...em, ...cpt];
    const userCodes = allRows.map((x) => norm(x.code)).filter(Boolean);
    const userMods = allRows.map((x) => norm(x.mod)).filter(Boolean); // modifiers the student attached
    const key = chart.answerKey.map((k) => ({
      code: norm(k.code),
      desc: k.desc,
      type: k.type,
      why: k.why,
      raw: k.code,
    }));
    // DRG scored specially (IP); PDGM informational; MOD scored against attached modifiers
    const drgKey = key.find((k) => k.type === 'DRG');
    const modKey = key.filter((k) => k.type === 'MOD');
    const codeKey = key.filter((k) => k.type !== 'DRG' && k.type !== 'PDGM' && k.type !== 'MOD');
    const correctCodes = codeKey.filter((k) => userCodes.includes(k.code));
    const correctMods = modKey.filter((k) => userMods.includes(k.code));
    const correct = [...correctCodes, ...correctMods];
    const missed = [
      ...codeKey.filter((k) => !userCodes.includes(k.code)),
      ...modKey.filter((k) => !userMods.includes(k.code)),
    ];
    // For each wrong entry, pair it with the audited code of the SAME TYPE that
    // the student missed — so the report can say "you coded X, the audited code is Y, because...".
    const missedCodes = codeKey.filter((k) => !userCodes.includes(k.code));
    const usedSubs = {};
    const wrong = allRows
      .filter((x) => x.code && !codeKey.find((k) => k.code === norm(x.code)))
      .map((x) => {
        const uc = norm(x.code);
        const sameFamily = (a, b) => {
          if (/^99[2-4]/.test(a) && /^99[2-4]/.test(b)) return true; // E/M level
          if (/^[0-9]/.test(a) && /^[0-9]/.test(b)) return a.slice(0, 3) === b.slice(0, 3); // CPT family
          return a.charAt(0) === b.charAt(0); // same ICD chapter letter
        };
        let sub = missedCodes.find((k) => !usedSubs[k.code] && sameFamily(uc, k.code));
        if (!sub) sub = missedCodes.find((k) => !usedSubs[k.code]);
        if (sub) usedSubs[sub.code] = true;
        return Object.assign(
          {},
          x,
          sub ? { correctedTo: { code: sub.raw || sub.code, desc: sub.desc, why: sub.why } } : {},
        );
      });
    let drgOk = null;
    if (drgKey) {
      const userDrgNum = (drg || '').split(' — ')[0].trim();
      drgOk = userDrgNum === drgKey.code;
    }
    const totalItems = codeKey.length + modKey.length + (drgKey ? 1 : 0);
    const gotItems = correct.length + (drgOk ? 1 : 0);
    const accuracy = totalItems ? Math.round((gotItems / totalItems) * 100) : 0;
    const pdgmKey = key.find((k) => k.type === 'PDGM');
    const res = {
      accuracy,
      correct,
      missed,
      wrong,
      total: totalItems,
      drgKey,
      drgOk,
      userDrg: drg,
      pdgmKey,
    };
    setResult(res);
    // Persist IMMEDIATELY on scoring. Previously the save only ran from
    // "Save & Continue"; a student who read the score and hit "Back to queue"
    // (or Esc, or browser-back) lost the chart silently.
    onSubmit(res);
  };
  // The modal buttons only dismiss now — the score is already saved.
  const confirmAndClose = () => {
    onClose();
  };

  const drgResults =
    drgSearch.trim().length >= 1
      ? DRG_OPTIONS.filter((o) => o.toLowerCase().includes(drgSearch.toLowerCase().trim())).slice(
          0,
          12,
        )
      : DRG_OPTIONS.slice(0, 12);

  return (
    <div>
      <div className="coder">
        {/* record pane */}
        <div className="record-pane">
          {(function () {
            const hf = chartHeaderFields(chart);
            return (
              <div className="pt-header">
                <div className="pt-name">
                  <span>{chart.patient.name}</span>
                  <button
                    className="btn"
                    style={{
                      padding: '4px 11px',
                      fontSize: 11.5,
                      color: 'var(--color-white)',
                      background: 'rgba(255,255,255,.14)',
                      border: '1px solid rgba(255,255,255,.45)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={onClose}
                  >
                    ← Back to queue
                  </button>
                </div>
                <span className="pt-field">
                  {chart.patient.sex +
                    ' · ' +
                    chart.patient.age +
                    'y' +
                    (isIP ? ' · INPATIENT' : '')}
                </span>
                {hf.ptype ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.3,
                      padding: '2px 8px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                      color: hf.ptype.toLowerCase().indexOf('new') === 0 ? 'var(--tone-0f2f56)' : 'var(--color-white)',
                      background:
                        hf.ptype.toLowerCase().indexOf('new') === 0
                          ? 'var(--tone-7dd3c0)'
                          : 'rgba(255,255,255,.18)',
                      border: '1px solid rgba(255,255,255,.35)',
                    }}
                  >
                    {hf.ptype.toLowerCase().indexOf('new') === 0 ? 'NEW PATIENT' : 'ESTABLISHED'}
                  </span>
                ) : null}
                <span className="pt-field">
                  MRN<b>{hf.mrn}</b>
                </span>
                <span className="pt-field">
                  Acct<b>{hf.acct}</b>
                </span>
                {hf.dos ? (
                  <span className="pt-field">
                    DOS<b>{hf.dos}</b>
                  </span>
                ) : null}
                <span className="pt-field">
                  Dept<b>{chart.deptName || chart.dept}</b>
                </span>
              </div>
            );
          })()}
          <RecordTabs chart={chart} />
        </div>
        {/* code pane */}
        <div className="code-pane">
          <div className="pane-h">
            <span>{isIP ? 'Inpatient Coding' : 'Live Coding'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={openLookup}
                title="Open the full CODIVIA Code Search in a separate window"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '4px 11px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  letterSpacing: 0.3,
                  textTransform: 'none',
                  border: '1px solid ' + (lookupOpen ? 'var(--teal)' : 'var(--line)'),
                  background: lookupOpen ? 'var(--teal)' : 'var(--color-white)',
                  color: lookupOpen ? 'var(--color-white)' : 'var(--teal-d)',
                }}
              >
                ⌕ CODIVIA Code Search
              </button>
              <span
                style={{ fontSize: 10, color: dbStatus === 'ready' ? 'var(--ok)' : 'var(--mod)' }}
              >
                {dbStatus === 'ready'
                  ? '\u25cf 171,568 codes loaded'
                  : dbStatus === 'loading'
                    ? '\u25cc loading codes\u2026'
                    : '\u25cb code DB'}
              </span>
            </div>
          </div>
          <div className="code-body">
            {isIP ? (
              <>
                <CodeSection
                  title="Principal Diagnosis (ICD-10-CM)"
                  sub="The condition chiefly responsible for admission — drives the DRG. Assign POA."
                  rows={dx}
                  setRows={setDx}
                  codeDB={codeDB}
                  filterSys={[0]}
                  poa={true}
                />
                <CodeSection
                  title="Secondary Diagnoses (ICD-10-CM)"
                  sub={'Comorbidities & complications (CC/MCC). Assign POA to each.'}
                  rows={sdx}
                  setRows={setSdx}
                  codeDB={codeDB}
                  filterSys={[0]}
                  poa={true}
                />
                <CodeSection
                  title="Principal Procedure (ICD-10-PCS)"
                  sub="The procedure most related to the principal dx — 7-character code."
                  rows={pcs}
                  setRows={setPcs}
                  codeDB={codeDB}
                  filterSys={[1]}
                />
                <CodeSection
                  title="Secondary Procedures (ICD-10-PCS)"
                  sub="Additional significant procedures performed this stay."
                  rows={spcs}
                  setRows={setSpcs}
                  codeDB={codeDB}
                  filterSys={[1]}
                />
                {/* DRG picker */}
                <div className="codesec">
                  <div className="lbl">
                    MS-DRG
                    <span className="sub">Determine the DRG from dx + procedures + severity</span>
                  </div>
                  {drg ? (
                    <div className="selcode">
                      <span className="c">{drg.split(' — ')[0]}</span>
                      <span className="d">{drg.split(' — ').slice(1).join(' — ')}</span>
                      <button
                        className="rm"
                        onClick={() => {
                          setDrg('');
                          setDrgSearch('');
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="searchbox">
                      <input
                        value={drgSearch}
                        placeholder="Search DRG number or title…"
                        onChange={(ev) => {
                          setDrgSearch(ev.target.value);
                          setDrgOpen(true);
                        }}
                        onFocus={() => setDrgOpen(true)}
                        onBlur={() => setTimeout(() => setDrgOpen(false), 180)}
                      />
                      {drgOpen && (
                        <div className="dropdown">
                          {drgResults.map((o, i) => (
                            <div
                              className="dropitem"
                              key={i}
                              onMouseDown={() => {
                                setDrg(o);
                                setDrgOpen(false);
                              }}
                            >
                              <span className="dc">{o.split(' — ')[0]}</span>
                              <span className="sys">DRG</span>
                              <span className="dd">{o.split(' — ').slice(1).join(' — ')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <CodeSection
                  title="Diagnoses (ICD-10-CM)"
                  sub={
                    isHH
                      ? 'Primary diagnosis drives the PDGM clinical group — code the focus of care first'
                      : 'Type a condition — e.g. "pain", "diabetes"'
                  }
                  rows={dx}
                  setRows={setDx}
                  codeDB={codeDB}
                  filterSys={[0]}
                  onLookup={openLookup}
                />
                {hasEM && (
                  <CodeSection
                    title="Level of Service (E/M)"
                    sub="Assign the E/M level — e.g. 99213, 99214, 99283"
                    rows={em}
                    setRows={setEm}
                    codeDB={codeDB}
                    filterSys={[2]}
                    mods={true}
                    onLookup={openLookup}
                  />
                )}
                {!isHH && (
                  <CodeSection
                    title="CPT / HCPCS"
                    sub={'Procedures, drugs & supplies · add a modifier after picking a code'}
                    rows={cpt}
                    setRows={setCpt}
                    codeDB={codeDB}
                    filterSys={[2, 3]}
                    mods={true}
                    onLookup={openLookup}
                  />
                )}
              </>
            )}
          </div>
          <div className="submitbar" style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={openLookup}
              title="Open the full CODIVIA Code Search in a separate window"
              style={{
                flex: '0 0 auto',
                padding: '0 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 800,
                border: '1px solid var(--line)',
                background: lookupOpen ? 'var(--tone-eefaf8)' : 'var(--color-white)',
                color: lookupOpen ? 'var(--teal-d)' : 'var(--ink)',
              }}
            >
              ⌕ Code Search
            </button>
            <button className="submitbtn" style={{ flex: 1 }} onClick={submit}>
              Submit for Scoring
            </button>
          </div>
        </div>
      </div>
      {lookupOpen && (
        <FloatingLookup
          codeDB={codeDB}
          dbStatus={dbStatus}
          onInsert={insertFromLookup}
          isHH={isHH}
          notice={
            popupBlocked
              ? 'Your browser blocked the pop-up window, so Code Search opened here instead. Allow pop-ups for this site to use a separate window.'
              : ''
          }
          onClose={() => setLookupOpen(false)}
        />
      )}
      {result && (
        <ResultModal
          result={result}
          chart={chart}
          saveState={saveState}
          onRedo={() => setResult(null)}
          onClose={confirmAndClose}
        />
      )}
    </div>
  );
}

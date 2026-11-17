/* CODIVIA admin — Upload page: the work-queue fields of a chart (same structure as the Chart model).
   Work type, patient, documents, encounter banner, original charges (review / DRG / denial), denial
   invoice + history, grading extras (disposition, denial decision, why-not reasons) and the physician's
   query answer. `toCasePayload` turns the form into the POST /admin/uploads fields. */
import { useState } from 'react';
import { post } from '../../services/apiHelper.js';
import { ADMIN_UPLOADS_EXTRACT } from '../../services/endpoints.js';
import { validateCode } from '../../utils/codes.js';

// Option lists (work types, POA, dispositions, remit codes, decisions) come from the database
// through `lists` (useReference → GET /reference/work-queue).
const opts = (lists, key) => (lists && lists[key]) || [];

export const emptyCase = () => ({
  workType: 'code',
  difficulty: 'moderate',
  patient: { name: '', sex: 'F', age: '' },
  documents: [],
  encounter: { mrn: '', acct: '', encounterId: '', dos: '', admit: '', discharge: '', los: '', provider: '', specialty: '', visitType: '', pos: '', facility: '', payer: '', plan: '', member: '', ptype: '', lastSeen: '', allergy: '' },
  original: { dx: [], lines: [], pcs: '', disp: '', drg: '', rules: '', enteredBy: '' },
  denial: { queue: '', invoice: { num: '', icn: '', status: 'Denied', received: '', billed: '', allowed: '', daysToAppeal: '' }, history: [] },
  keyMeta: { disp: '', dispWhy: '', decision: '', decisionWhy: '', extraWhy: '' },
  cdiResponse: '',
});

// ---- saved chart / upload → form (the Edit form starts from this) ----
const str = (v) => (v === undefined || v === null ? '' : String(v));
export function fromCase(src = {}) {
  const base = emptyCase();
  const o = src.original || {};
  const d = src.denial || {};
  const km = src.keyMeta || {};
  return {
    ...base,
    workType: src.workType || 'code',
    difficulty: src.difficulty || 'moderate',
    patient: { name: str(src.patient && src.patient.name), sex: (src.patient && src.patient.sex) || 'F', age: str(src.patient && src.patient.age) },
    documents: (src.documents || []).map((x, i) => ({ key: x.key || 'd' + (i + 1), title: str(x.title), sub: str(x.sub), body: str(x.body) })),
    encounter: Object.fromEntries(Object.keys(base.encounter).map((k) => [k, str((src.encounter || {})[k])])),
    original: {
      dx: (o.dx || []).map((x) => ({ code: str(x.code), poa: str(x.poa) })),
      lines: (o.lines || []).map((l) => ({
        code: str(l.code),
        mods: (l.mods || []).join(','),
        units: str(l.units || 1),
        ptrs: (l.ptrs || []).join(', '),
        remit: str(l.remit),
        billed: str(l.billed),
      })),
      pcs: (o.pcs || []).join(', '),
      disp: str(o.disp),
      drg: str(o.drg),
      rules: (o.rules || []).join('\n'),
      enteredBy: str(o.enteredBy),
    },
    denial: {
      queue: str(d.queue),
      invoice: Object.fromEntries(Object.keys(base.denial.invoice).map((k) => [k, str((d.invoice || {})[k] ?? base.denial.invoice[k])])),
      history: (d.history || []).map((h) => [0, 1, 2, 3].map((i) => str(h[i]))),
    },
    keyMeta: {
      disp: str(km.disp),
      dispWhy: str(km.dispWhy),
      decision: str(km.decision),
      decisionWhy: str(km.decisionWhy),
      extraWhy: Object.entries(km.extraWhy || {})
        .map(([code, why]) => code + ': ' + why)
        .join('\n'),
    },
    cdiResponse: str(src.cdiResponse),
  };
}

// ---- form → API ----
const list = (s) => String(s || '').split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v));
const compact = (o) => {
  const out = {};
  Object.entries(o).forEach(([k, v]) => {
    if (v === '' || v == null || (Array.isArray(v) && !v.length)) return;
    out[k] = v;
  });
  return Object.keys(out).length ? out : undefined;
};
export function toCasePayload(c, { inpatient }) {
  const type = c.workType;
  const enc = compact({ ...c.encounter, los: num(c.encounter.los) });
  const payload = {
    workType: type,
    difficulty: c.difficulty,
    // Blank name / age are left out, so the server's defaults apply.
    patient: compact({ name: c.patient.name.trim(), sex: c.patient.sex, age: num(c.patient.age) }),
    documents: c.documents.filter((d) => d.title.trim() && d.body.trim()).map((d, i) => ({ key: d.key || 'd' + (i + 1), title: d.title.trim(), sub: d.sub.trim(), body: d.body.trim() })),
    cdiResponse: c.cdiResponse.trim(),
  };
  if (enc) payload.encounter = enc;
  if (type !== 'code') {
    const o = c.original;
    payload.original = compact({
      dx: o.dx.filter((d) => d.code.trim()).map((d) => ({ code: d.code.trim().toUpperCase(), poa: inpatient ? d.poa : '' })),
      lines: o.lines
        .filter((l) => l.code.trim())
        .map((l) => compact({ code: l.code.trim().toUpperCase(), mods: list(l.mods).slice(0, 4), units: num(l.units) || 1, ptrs: list(l.ptrs).slice(0, 4), remit: type === 'denial' ? l.remit : '', billed: type === 'denial' ? num(l.billed) : undefined })),
      pcs: list(o.pcs),
      disp: o.disp,
      drg: o.drg.trim(),
      rules: o.rules.split('\n').map((r) => r.trim()).filter(Boolean),
      enteredBy: o.enteredBy.trim(),
    });
  }
  if (type === 'denial') {
    const inv = c.denial.invoice;
    payload.denial = {
      queue: c.denial.queue.trim(),
      invoice: compact({ num: inv.num.trim(), icn: inv.icn.trim(), status: inv.status.trim(), received: inv.received.trim(), billed: num(inv.billed), allowed: num(inv.allowed), daysToAppeal: num(inv.daysToAppeal) }) || {},
      history: c.denial.history.filter((h) => h.some((x) => x.trim())).map((h) => h.map((x) => x.trim())),
    };
  }
  const extraWhy = Object.fromEntries(
    c.keyMeta.extraWhy
      .split('\n')
      .map((l) => l.match(/^\s*([A-Z0-9.]+)\s*[:—-]\s*(.+)$/i))
      .filter(Boolean)
      .map((m) => [m[1].toUpperCase(), m[2].trim()]),
  );
  const km = compact({
    disp: inpatient ? c.keyMeta.disp : '',
    dispWhy: inpatient ? c.keyMeta.dispWhy.trim() : '',
    decision: type === 'denial' ? c.keyMeta.decision : '',
    decisionWhy: type === 'denial' ? c.keyMeta.decisionWhy.trim() : '',
    extraWhy: Object.keys(extraWhy).length ? extraWhy : undefined,
  });
  if (km) payload.keyMeta = km;
  return payload;
}

// What the student workspace needs for this work type (checked before publishing).
export function caseProblems(c) {
  const p = [];
  const o = c.original;
  if (c.workType === 'review' && !o.dx.some((d) => d.code.trim()) && !o.lines.some((l) => l.code.trim())) p.push('A charge review needs the provider’s original diagnoses or charge lines.');
  if (c.workType === 'drg' && !o.dx.some((d) => d.code.trim())) p.push('A DRG validation needs the pre-coded diagnoses.');
  if (c.workType === 'denial') {
    if (!o.lines.some((l) => l.code.trim())) p.push('A denial needs the charge lines as billed.');
    if (!o.lines.some((l) => l.remit)) p.push('A denial needs at least one remit (reason) code.');
    if (!c.denial.invoice.num.trim()) p.push('A denial needs the invoice / claim number.');
    if (!c.keyMeta.decision) p.push('A denial needs the correct decision.');
  }
  const badCodes = [...o.dx.map((d) => d.code), ...o.lines.map((l) => l.code), ...list(o.pcs)].filter((x) => x.trim() && validateCode(x) === false);
  if (c.workType !== 'code' && badCodes.length) p.push('Not in the code database: ' + badCodes.join(', '));
  return p;
}

// ---------------------------------------------------------------- UI
const lbl = { fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em', marginBottom: 5, textTransform: 'uppercase' };
const inp = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', minHeight: 36 };
const sec = { padding: '14px 20px', borderTop: '1px solid var(--line)' };
const h4 = { margin: '0 0 10px', fontSize: 13.5, fontWeight: 800 };
const hint = { fontSize: 11.5, color: 'var(--muted)', margin: '-6px 0 10px' };
const ghostBtn = { background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 12 };
const xBtn = { border: '1px solid var(--line)', background: 'var(--color-white)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 800 };
const grid = (cols) => ({ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '10px 12px' });
const codeBorder = (code) => ({ borderColor: code && validateCode(code) === false ? 'var(--tone-fca5a5)' : 'var(--line)' });

function Field({ label, children, span }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <div style={lbl}>{label}</div>
      {children}
    </div>
  );
}

export function CaseFields({ value: c, onChange, inpatient, lists, onError }) {
  const [busyDoc, setBusyDoc] = useState(false);
  const set = (fn) => onChange((cur) => {
    const n = structuredClone(cur);
    fn(n);
    return n;
  });
  const text = (path, ph, extra) => {
    const parts = path.split('.');
    const get = (o) => parts.reduce((x, k) => x[k], o);
    return (
      <input
        value={get(c) ?? ''}
        placeholder={ph}
        onChange={(e) => set((n) => (parts.slice(0, -1).reduce((x, k) => x[k], n)[parts[parts.length - 1]] = e.target.value))}
        style={{ ...inp, ...(extra || {}) }}
      />
    );
  };
  const addDocFromFile = async (f) => {
    setBusyDoc(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const r = await post(ADMIN_UPLOADS_EXTRACT, form);
      set((n) => n.documents.push({ key: 'd' + Date.now().toString(36), title: f.name.replace(/\.[^.]+$/, ''), sub: '', body: r.text || '' }));
    } catch (e) {
      onError('Document extract failed: ' + (e.message || e));
    }
    setBusyDoc(false);
  };
  const type = c.workType;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-h">
        <div>
          <h3>Chart setup</h3>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>What the student is asked to do, the patient banner and the source documents.</div>
        </div>
      </div>

      {/* work type, difficulty, patient */}
      <div style={{ padding: '14px 20px' }}>
        <div style={grid(4)}>
          <Field label="Work type" span={2}>
            <select value={type} onChange={(e) => set((n) => (n.workType = e.target.value))} style={inp}>
              {opts(lists, 'workTypes')
                .filter((t) => inpatient || !(t.meta || {}).inpatientOnly)
                .map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label + (t.desc ? ' — ' + t.desc : '')}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Difficulty">
            <select value={c.difficulty} onChange={(e) => set((n) => (n.difficulty = e.target.value))} style={inp}>
              {['beginner', 'moderate', 'advanced'].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <div />
          <Field label="Patient name (fictional)" span={2}>
            {text('patient.name', 'e.g. Sharon Iyer')}
          </Field>
          <Field label="Sex">
            <select value={c.patient.sex} onChange={(e) => set((n) => (n.patient.sex = e.target.value))} style={inp}>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>
          </Field>
          <Field label="Age">{text('patient.age', 'years', { width: '100%' })}</Field>
        </div>
      </div>

      {/* encounter banner */}
      <div style={sec}>
        <h4 style={h4}>Encounter (patient banner)</h4>
        <p style={hint}>Shown at the top of the workspace and in the queue. Leave blank to read MRN, date, payer and provider from the record header.</p>
        <div style={grid(4)}>
          <Field label="MRN">{text('encounter.mrn')}</Field>
          <Field label="Account">{text('encounter.acct')}</Field>
          <Field label="Encounter ID">{text('encounter.encounterId')}</Field>
          {inpatient ? <Field label="LOS (days)">{text('encounter.los')}</Field> : <Field label="Date of service">{text('encounter.dos', 'MM/DD/YYYY')}</Field>}
          {inpatient && (
            <>
              <Field label="Admit date">{text('encounter.admit', 'MM/DD/YYYY')}</Field>
              <Field label="Discharge date">{text('encounter.discharge', 'MM/DD/YYYY')}</Field>
            </>
          )}
          <Field label={inpatient ? 'Attending' : 'Provider'}>{text('encounter.provider')}</Field>
          <Field label="Specialty">{text('encounter.specialty')}</Field>
          {!inpatient && (
            <>
              <Field label="Visit type">{text('encounter.visitType', 'Office visit')}</Field>
              <Field label="Place of service">{text('encounter.pos', '11 · Office')}</Field>
              <Field label="Patient status">
                <select value={c.encounter.ptype} onChange={(e) => set((n) => (n.encounter.ptype = e.target.value))} style={inp}>
                  <option value="">—</option>
                  <option value="new">New patient</option>
                  <option value="est">Established</option>
                </select>
              </Field>
              <Field label="Last seen">{text('encounter.lastSeen', 'MM/DD/YYYY')}</Field>
            </>
          )}
          <Field label="Facility">{text('encounter.facility')}</Field>
          <Field label="Payer">{text('encounter.payer')}</Field>
          <Field label="Plan">{text('encounter.plan')}</Field>
          <Field label="Member ID">{text('encounter.member')}</Field>
          <Field label="Allergy">{text('encounter.allergy', 'NKDA')}</Field>
        </div>
      </div>

      {/* documents */}
      <div style={sec}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <h4 style={{ ...h4, margin: 0 }}>Source documents</h4>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Optional. Without them, students see the extracted record as one document.</span>
          <span style={{ flex: 1 }} />
          <label className="btn" style={{ ...ghostBtn, cursor: 'pointer' }}>
            {busyDoc ? 'Extracting…' : '+ From file'}
            <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} disabled={busyDoc} onChange={(e) => e.target.files[0] && addDocFromFile(e.target.files[0])} />
          </label>
          <button type="button" className="btn" style={ghostBtn} onClick={() => set((n) => n.documents.push({ key: 'd' + Date.now().toString(36), title: '', sub: '', body: '' }))}>
            + Blank document
          </button>
        </div>
        {c.documents.map((d, i) => (
          <div key={d.key} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={d.title} placeholder="Title, e.g. History & Physical" onChange={(e) => set((n) => (n.documents[i].title = e.target.value))} style={{ ...inp, flex: 1 }} />
              <input value={d.sub} placeholder="Subtitle, e.g. 03/15 01:10 · R. Patel, MD" onChange={(e) => set((n) => (n.documents[i].sub = e.target.value))} style={{ ...inp, flex: 1 }} />
              <button type="button" style={xBtn} disabled={i === 0} onClick={() => set((n) => n.documents.splice(i - 1, 0, n.documents.splice(i, 1)[0]))} title="Move up">
                ▲
              </button>
              <button type="button" style={xBtn} onClick={() => set((n) => n.documents.splice(i, 1))} title="Remove">
                ×
              </button>
            </div>
            <textarea value={d.body} placeholder={'HEADING:\nText…  (lines ending in ":" in capitals start sections)'} onChange={(e) => set((n) => (n.documents[i].body = e.target.value))} style={{ ...inp, minHeight: 110, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12 }} />
          </div>
        ))}
      </div>

      {/* original charges */}
      {type !== 'code' && (
        <div style={sec}>
          <h4 style={h4}>{type === 'denial' ? 'Claim as billed' : type === 'drg' ? 'Pre-coded abstract' : 'Provider’s original charges'}</h4>
          <p style={hint}>What arrives with the chart. The student starts from this and must correct it.</p>
          <div style={lbl}>Diagnoses (in billed order)</div>
          {c.original.dx.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 26, fontWeight: 800, color: 'var(--muted)', paddingTop: 8 }}>{'ABCDEFGHIJKLMNOPQRSTUVWXY'[i]}</span>
              <input value={d.code} placeholder="ICD-10-CM" onChange={(e) => set((n) => (n.original.dx[i].code = e.target.value.toUpperCase()))} style={{ ...inp, width: 130, fontWeight: 800, ...codeBorder(d.code) }} />
              {inpatient && (
                <select value={d.poa} onChange={(e) => set((n) => (n.original.dx[i].poa = e.target.value))} style={{ ...inp, width: 100 }}>
                  <option value="">POA blank</option>
                  {opts(lists, 'poa').map((p) => (
                    <option key={p.value} value={p.value}>
                      {'POA ' + p.value}
                    </option>
                  ))}
                </select>
              )}
              <button type="button" style={xBtn} onClick={() => set((n) => n.original.dx.splice(i, 1))}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="btn" style={{ ...ghostBtn, marginBottom: 12 }} onClick={() => set((n) => n.original.dx.push({ code: '', poa: '' }))}>
            + Diagnosis
          </button>

          {!inpatient && (
            <>
              <div style={lbl}>Charge lines</div>
              {c.original.lines.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <input value={l.code} placeholder="CPT/HCPCS" onChange={(e) => set((n) => (n.original.lines[i].code = e.target.value.toUpperCase()))} style={{ ...inp, width: 110, fontWeight: 800, ...codeBorder(l.code) }} />
                  <input value={l.mods} placeholder="Mods e.g. 25,59" onChange={(e) => set((n) => (n.original.lines[i].mods = e.target.value.toUpperCase()))} style={{ ...inp, width: 120 }} />
                  <input value={l.units} placeholder="Units" onChange={(e) => set((n) => (n.original.lines[i].units = e.target.value.replace(/\D/g, '')))} style={{ ...inp, width: 70 }} />
                  <input value={l.ptrs} placeholder="Dx pointers e.g. R50.9, J01.90" onChange={(e) => set((n) => (n.original.lines[i].ptrs = e.target.value.toUpperCase()))} style={{ ...inp, flex: 1, minWidth: 180 }} />
                  {type === 'denial' && (
                    <>
                      <select value={l.remit} onChange={(e) => set((n) => (n.original.lines[i].remit = e.target.value))} style={{ ...inp, width: 100 }}>
                        <option value="">No remit</option>
                        {opts(lists, 'remitCodes').map((r) => (
                          <option key={r.value} value={r.value} title={r.desc}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <input value={l.billed} placeholder="Billed $" onChange={(e) => set((n) => (n.original.lines[i].billed = e.target.value.replace(/[^\d.]/g, '')))} style={{ ...inp, width: 100 }} />
                    </>
                  )}
                  <button type="button" style={xBtn} onClick={() => set((n) => n.original.lines.splice(i, 1))}>
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="btn" style={{ ...ghostBtn, marginBottom: 12 }} onClick={() => set((n) => n.original.lines.push({ code: '', mods: '', units: '1', ptrs: '', remit: '', billed: '' }))}>
                + Charge line
              </button>
            </>
          )}

          <div style={grid(inpatient ? 3 : 2)}>
            {inpatient && (
              <>
                <Field label="Procedures (ICD-10-PCS, comma separated)">{text('original.pcs', '5A09458')}</Field>
                <Field label="Disposition as coded">
                  <select value={c.original.disp} onChange={(e) => set((n) => (n.original.disp = e.target.value))} style={inp}>
                    <option value="">—</option>
                    {opts(lists, 'dispositions').map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="MS-DRG as coded">{text('original.drg', '190 — COPD w MCC')}</Field>
              </>
            )}
            <Field label="Entered by">{text('original.enteredBy', inpatient ? 'Auto-coder' : 'Provider name')}</Field>
            {type !== 'denial' && (
              <Field label="Rules that fired (one per line — shown in the queue)" span={inpatient ? 3 : 1}>
                <textarea value={c.original.rules} onChange={(e) => set((n) => (n.original.rules = e.target.value))} style={{ ...inp, minHeight: 60 }} placeholder={'Missing diagnosis pointer\nE/M review for 25/59 modifier'} />
              </Field>
            )}
          </div>
        </div>
      )}

      {/* denial */}
      {type === 'denial' && (
        <div style={sec}>
          <h4 style={h4}>Denial (EOB / remittance)</h4>
          <div style={grid(4)}>
            <Field label="Work queue">{text('denial.queue', 'PB Follow-up — Coding Denials')}</Field>
            <Field label="Invoice / claim number">{text('denial.invoice.num', 'INV-…')}</Field>
            <Field label="ICN">{text('denial.invoice.icn')}</Field>
            <Field label="Remit received">{text('denial.invoice.received', 'MM/DD/YYYY')}</Field>
            <Field label="Billed $">{text('denial.invoice.billed')}</Field>
            <Field label="Allowed $">{text('denial.invoice.allowed')}</Field>
            <Field label="Days left to appeal">{text('denial.invoice.daysToAppeal')}</Field>
            <Field label="Status">{text('denial.invoice.status')}</Field>
          </div>
          <div style={{ ...lbl, marginTop: 12 }}>Account history</div>
          {c.denial.history.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              {['Date', 'Event', 'Detail', 'Amount'].map((ph, k) => (
                <input key={k} value={h[k]} placeholder={ph} onChange={(e) => set((n) => (n.denial.history[i][k] = e.target.value))} style={{ ...inp, flex: k === 2 ? 2 : 1 }} />
              ))}
              <button type="button" style={xBtn} onClick={() => set((n) => n.denial.history.splice(i, 1))}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="btn" style={ghostBtn} onClick={() => set((n) => n.denial.history.push(['', '', '', '']))}>
            + History row
          </button>
        </div>
      )}

      {/* grading extras */}
      <div style={sec}>
        <h4 style={h4}>Grading extras (never shown to students)</h4>
        <div style={grid(2)}>
          {type === 'denial' && (
            <>
              <Field label="Correct decision">
                <select value={c.keyMeta.decision} onChange={(e) => set((n) => (n.keyMeta.decision = e.target.value))} style={inp}>
                  <option value="">—</option>
                  {opts(lists, 'denialDecisions').map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Why that decision">{text('keyMeta.decisionWhy', 'e.g. CO-4 is our modifier error → corrected claim')}</Field>
            </>
          )}
          {inpatient && (
            <>
              <Field label="Correct discharge disposition">
                <select value={c.keyMeta.disp} onChange={(e) => set((n) => (n.keyMeta.disp = e.target.value))} style={inp}>
                  <option value="">— not graded —</option>
                  {opts(lists, 'dispositions').map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Why that disposition">{text('keyMeta.dispWhy')}</Field>
            </>
          )}
          <Field label="Why codes should NOT be reported (one per line: CODE: reason)" span={2}>
            <textarea value={c.keyMeta.extraWhy} onChange={(e) => set((n) => (n.keyMeta.extraWhy = e.target.value))} style={{ ...inp, minHeight: 60 }} placeholder={'R50.9: Fever is integral to the sinusitis (OCG I.B.5)\nJ01.90: Unspecified — site and recurrence are documented'} />
          </Field>
          <Field label="Suggested answer to a CDI query (shown to you on Physician Queries; never sent automatically)" span={2}>
            <textarea value={c.cdiResponse} onChange={(e) => set((n) => (n.cdiResponse = e.target.value))} style={{ ...inp, minHeight: 50 }} placeholder="Optional. e.g. Confirmed: acute recurrent maxillary sinusitis…" />
          </Field>
        </div>
      </div>
    </div>
  );
}

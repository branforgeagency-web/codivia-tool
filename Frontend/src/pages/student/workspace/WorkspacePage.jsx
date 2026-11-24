/* CODIVIA — coding workspace for one chart (route /charts/:dept/:chartId).
   Data: GET /my-charts/:dept/charts/:chartId — documents, encounter, what arrived with the chart
   (review / DRG / denial) and the signed-in student's saved work. No answer key.
   The work autosaves (PUT …/work). Defer / transfer / physician query / comments are server
   actions on the student's own work. Submitting is scored on the server (PUT /chart-results/:id). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../../components/layout/Header.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { PageLoader } from '../../../components/ui/PageLoader.jsx';
import { useSession } from '../../../context/SessionContext.jsx';
import { useStudent } from '../../../context/StudentContext.jsx';
import { coderPath, deptQueuePath, PATHS } from '../../../routes/paths.js';
import { get, post, put } from '../../../services/apiHelper.js';
import { MY_CHART, MY_CHART_COMMENTS, MY_CHART_DEFER, MY_CHART_QUERIES, MY_CHART_SESSION, MY_CHART_TRANSFER, MY_CHART_WORK, MY_DEPT_CHARTS } from '../../../services/endpoints.js';
import { useReference, workTypeInfo } from '../../../hooks/useReference.js';
import { DenialLeft, DenialRight } from './Denial.jsx';
import { DocumentsPanel } from './Documents.jsx';
import { fetchNotes } from './Encoder.jsx';
import { CodeEntry } from './CodeEntry.jsx';
import { runEdits } from './edits.js';
import { DeferModal, QueryModal, SubmitModal, TransferModal } from './Modals.jsx';
import { BILLING_LABEL, codeDescriber, demographicsOf, documentsOf, dxClassOptions, ENCOUNTER_LABEL, firstTerm, fmtTime, icdRow, initialDraft, isBillable, isEM, norm, sequenceDx, settingOf, toSubmission, uid } from './model.js';
import { ResultView } from './Result.jsx';
import { AbstractSection, DrgSection, DxSection, EmSection, LinesSection, PcsSection } from './Sections.jsx';
import { Sidebar } from './Sidebar.jsx';
import './workspace.css';

const IP_TABS = [
  ['dx', 'Diagnoses'],
  ['pcs', 'Procedures (PCS)'],
  ['abs', 'Abstract'],
  ['drg', 'MS-DRG'],
];
const TAB_NAMES = { em: 'Level of service', dx: 'Diagnoses', lines: 'Charge lines', pcs: 'Procedures', abs: 'Abstract', drg: 'MS-DRG' };
// The coding tabs of a chart: inpatient as above; outpatient CPT first (level of service, charge
// lines), then ICD (diagnoses).
const tabsOf = (set) =>
  set.inpatient
    ? IP_TABS
    : [set.hasEM && ['em', 'Level of service'], set.hasLines && ['lines', 'Charge lines'], ['dx', 'Diagnoses']].filter(Boolean);
const SAVE_DELAY = 1200;

function Banner({ chart, set }) {
  const p = chart.patient || {};
  const e = chart.encounter || {};
  const f = (label, value, sub, mono) =>
    value ? (
      <div className="bf" key={label}>
        <span>{label}</span>
        <b className={mono ? 'm' : ''}>{value}</b>
        {sub ? <em>{sub}</em> : null}
      </div>
    ) : null;
  const ptype = e.ptype || '';
  // Plain charts: the record's demographic lines live here (not as a Documents tab).
  const demo = useMemo(() => demographicsOf(chart), [chart.record, chart.documents]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = new Set([p.name, ...Object.values(e)].filter((v) => typeof v === 'string' && v).map((v) => v.toLowerCase()));
  const [open, setOpen] = useState(true);
  const sexAge = (p.sex === 'F' ? 'Female' : p.sex === 'M' ? 'Male' : p.sex) + ' · ' + p.age + ' y';
  const toggle = (
    <button type="button" className={'wsx-bantoggle' + (open ? ' on' : '')} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Hide patient details' : 'Show patient details'} title={open ? 'Hide patient details' : 'Show patient details'}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
  if (!open) {
    return (
      <div className="wsx-bannerwrap closed">
        <div className="wsx-banner mini">
          <span className="nm">{p.name}</span>
          <span className="sub">{sexAge}</span>
          <span className="btag" title={'Encounter type: ' + ENCOUNTER_LABEL[set.encounterType]}>
            {set.encounterType}
          </span>
          {e.mrn && <span className="sub m">MRN {e.mrn}</span>}
          {e.allergy && e.allergy !== 'NKDA' && <span className="btag alert">Allergy: {e.allergy}</span>}
        </div>
        {toggle}
      </div>
    );
  }
  return (
    <div className="wsx-bannerwrap">
    <div className="wsx-banner">
      <div className="who">
        <div className="nm">{p.name}</div>
        <div className="sub">
          {p.sex === 'F' ? 'Female' : p.sex === 'M' ? 'Male' : p.sex} · {p.age} y
        </div>
        <div className="tags">
          {/* Encounter type (and billing type) from the chart record — read-only for the student. */}
          <span className="btag enc" title={'Encounter type: ' + set.encounterType + ' – ' + ENCOUNTER_LABEL[set.encounterType] + (set.billingType ? ' · ' + BILLING_LABEL[set.billingType] + ' billing' : '')}>
            {set.encounterType + ' · ' + ENCOUNTER_LABEL[set.encounterType].toUpperCase()}
          </span>
          {set.ip && set.billingType && <span className="btag">{set.billingType === 'facility' ? 'FACILITY' : 'PROFESSIONAL'}</span>}
          {ptype && <span className="btag">{ptype === 'new' ? 'NEW PATIENT' : 'ESTABLISHED'}</span>}
          {e.allergy && <span className={'btag' + (e.allergy !== 'NKDA' ? ' alert' : '')}>Allergy: {e.allergy}</span>}
          {chart.handwritten && <span className="btag">HANDWRITTEN</span>}
        </div>
      </div>
      {f('MRN', e.mrn, '', 1)}
      {f('Account', e.acct, '', 1)}
      {f('Encounter', e.encounterId, '', 1)}
      {set.ip ? f('Admit → Discharge', e.admit && `${e.admit} → ${e.discharge || '—'}`) : f('Date of service', e.dos)}
      {set.ip && f('LOS', e.los != null && e.los + ' days')}
      {f(set.ip ? 'Attending' : 'Provider', e.provider, e.specialty)}
      {!set.ip && f('Visit type · POS', e.visitType, e.pos && 'POS ' + e.pos)}
      {f('Payer', e.payer, e.plan)}
      {f('Member ID', e.member, '', 1)}
      {f('Facility', e.facility)}
      {f('Last seen', e.lastSeen)}
      {!Object.keys(e).length && f('Department', chart.deptName)}
      {demo.pairs
        .filter((x) => !shown.has(x.value.toLowerCase()))
        .map((x, i) => (
          <div className="bf" key={'d' + i}>
            <span>{x.label}</span>
            <b>{x.value}</b>
          </div>
        ))}
      {demo.notes.length > 0 && (
        <div className="bf note" title={demo.notes.join('\n')}>
          <span>Note</span>
          <b>{demo.notes.join(' · ')}</b>
        </div>
      )}
    </div>
    {toggle}
    </div>
  );
}

// route: /charts/:dept/:chartId
export default function WorkspacePage() {
  const { dept, chartId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, retryCodeDB } = useSession();
  const { session, stu, codeDB, dbStatus, submitChart } = useStudent();
  const { ref: lists, error: refError, retry: retryRef } = useReference(); // option lists from the database
  const [loadError, setLoadError] = useState(''); // chart could not be loaded (not a 404)
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [chart, setChart] = useState(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [work, setWork] = useState(null); // { status, queries, activity, ... }
  const [saveState, setSaveState] = useState(''); // '' | saving | saved | error
  const [savedAt, setSavedAt] = useState(null);
  const [tab, setTab] = useState('dx');
  const [codeSet, setCodeSet] = useState('icd'); // top-level coding tab: cpt | pcs | icd
  const [entryPrefill, setEntryPrefill] = useState(null); // { key, code, n }: code moved from the wrong entry box
  const [docKey, setDocKey] = useState('');
  const [find, setFind] = useState('');
  const [flash, setFlash] = useState(null);
  const [encQ, setEncQ] = useState('');
  const [encSel, setEncSel] = useState(null);
  const [sidebar, setSidebar] = useState(true);
  const [docsOpen, setDocsOpen] = useState(false); // Documents panel starts collapsed
  const [modal, setModal] = useState(null);
  const [dxCls, setDxCls] = useState(''); // diagnosis type picked next to the ICD-10-CM box ('' = automatic)
  const [notes, setNotes] = useState({});
  const [result, setResult] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [, tick] = useState(0);

  const encRef = useRef(null);
  const findRef = useRef(null);
  const dirty = useRef(false);
  const loaded = useRef(false);
  const startedAt = useRef(Date.now());
  const baseTime = useRef(0);
  const draftRef = useRef(null);
  draftRef.current = draft;

  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(toast.t);
    toast.t = setTimeout(() => setToastMsg(''), 2800);
  }, []);
  const describe = useMemo(() => codeDescriber(codeDB), [codeDB]);
  const elapsed = () => baseTime.current + Math.floor((Date.now() - startedAt.current) / 1000);

  // ---- load ----
  useEffect(() => {
    let live = true;
    setChart(null);
    setDraft(null);
    setResult(null);
    setMissing(false);
    setLoadError('');
    loaded.current = false;
    get(MY_CHART(dept, chartId))
      .then((c) => {
        if (!live) return;
        setChart(c);
        setWork(c.work);
        baseTime.current = (c.work && c.work.timeSpent) || 0;
        startedAt.current = Date.now();
        setTab(tabsOf(settingOf(c))[0][0]);
        setCodeSet(settingOf(c).hasLines ? 'cpt' : 'icd');
        setFind('');
        setEncQ('');
        setEncSel(null);
        setDxCls('');
      })
      .catch((e) => {
        if (!live) return;
        // Not in the allocation / deleted → back to the queue. Anything else (network, server) → retry screen.
        if (e && (e.status === 404 || e.status === 403)) setMissing(true);
        else setLoadError((e && e.message) || 'The chart could not be loaded.');
      });
    return () => {
      live = false;
    };
  }, [dept, chartId, loadAttempt]);

  // The draft needs code descriptions for what arrived with the chart, so wait for the code DB (or give up waiting).
  useEffect(() => {
    if (!chart || draft) return;
    if (dbStatus !== 'ready' && dbStatus !== 'error' && !(chart.work && chart.work.draft)) return;
    setDraft(initialDraft(chart, describe));
    const docs0 = documentsOf(chart, (chart.work && chart.work.queries) || []);
    setDocKey(docs0[0].key);
    setTimeout(() => (loaded.current = true), 0);
  }, [chart, draft, dbStatus, describe]);

  // ---- timer ----
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ---- autosave ----
  const saveNow = useCallback(async () => {
    const d = draftRef.current;
    if (!d || !dirty.current) return;
    dirty.current = false;
    setSaveState('saving');
    try {
      const r = await put(MY_CHART_WORK(dept, chartId), { draft: d, timeSpent: elapsed() });
      setSaveState('saved');
      setSavedAt(r.savedAt ? new Date(r.savedAt) : new Date());
      setWork((w) => ({ ...(w || {}), status: r.status }));
    } catch (e) {
      dirty.current = true;
      setSaveState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept, chartId]);
  useEffect(() => {
    if (!draft || !loaded.current) return undefined;
    dirty.current = true;
    const t = setTimeout(saveNow, SAVE_DELAY);
    return () => clearTimeout(t);
  }, [draft, saveNow]);
  useEffect(() => () => saveNow(), [saveNow]); // flush when leaving the page

  const change = useCallback((fn) => {
    setDraft((d) => {
      const n = structuredClone(d);
      fn(n);
      return n;
    });
  }, []);

  // ---- queries: poll until the physician (an admin, from Physician Queries) answers ----
  const pending = ((work && work.queries) || []).some((q) => !q.answered);
  useEffect(() => {
    if (!pending) return undefined;
    const t = setInterval(async () => {
      try {
        const w = await get(MY_CHART_WORK(dept, chartId));
        setWork((cur) => {
          const before = ((cur && cur.queries) || []).filter((q) => q.answered).length;
          if (w.queries.filter((q) => q.answered).length > before) toast('The physician answered your query — see “Query Response” in Documents');
          return { ...cur, ...w, draft: undefined };
        });
      } catch (e) {
        /* keep polling */
      }
    }, 10000);
    return () => clearInterval(t);
  }, [pending, dept, chartId, toast]);

  // ---- tabular notes for the diagnoses (edits engine) ----
  const dxKey = draft ? draft.dx.map((x) => x.code).join('|') : '';
  useEffect(() => {
    if (!draft) return;
    draft.dx.forEach((x) => {
      if (notes[norm(x.code)]) return;
      fetchNotes(x.code).then((n) => setNotes((cur) => ({ ...cur, [norm(x.code)]: n })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dxKey]);

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e) => {
      if (modal) return;
      const mod = e.ctrlKey || e.metaKey;
      const entry = document.querySelector('.wsx-entry input'); // first code entry box (CPT first)
      if (mod && e.key.toLowerCase() === 'k' && entry) {
        e.preventDefault();
        entry.focus();
        entry.select();
      } else if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setDocsOpen(true);
        setTimeout(() => {
          if (findRef.current) {
            findRef.current.focus();
            findRef.current.select();
          }
        }, 0);
      } else if (e.altKey && /^[1-4]$/.test(e.key) && chart && tabsOf(settingOf(chart))[+e.key - 1]) {
        e.preventDefault();
        setTab(tabsOf(settingOf(chart))[+e.key - 1][0]);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, chart]);

  if (!(stu.depts && stu.depts[dept] != null) || missing) return <Navigate to={deptQueuePath(dept)} replace />;
  if (loadError || refError)
    return (
      <ErrorState
        variant="full"
        title={loadError ? "Couldn't open this chart" : "Couldn't load the coding options"}
        message={(loadError || refError) + ' Your saved work is safe on the server.'}
        onRetry={() => (loadError ? setLoadAttempt((n) => n + 1) : retryRef())}
        actions={[{ label: 'Back to chart list', onClick: () => navigate(deptQueuePath(dept)) }]}
      />
    );
  if (!chart || !draft || !lists) return <PageLoader variant="full" label="Loading chart" />;

  // ---------------------------------------------------------------- derived
  const set = settingOf(chart);
  const type = workTypeInfo(lists, chart.workType || 'code');
  const queries = (work && work.queries) || [];
  const docs = documentsOf(chart, queries);
  const edits = runEdits({ chart, draft, notes, describe, lookupIcd: codeDB ? (c) => icdRow(codeDB, c) : null });
  const errs = edits.filter((e) => e.sev === 'err').length;
  const openWarns = edits.filter((e) => e.sev === 'warn' && !draft.acks.includes(e.key)).length;
  const ready = !errs && !openWarns && !pending;
  const original = chart.original ? { dx: chart.original.dx || [], lines: chart.original.lines || [], drg: chart.original.drg, enteredBy: chart.original.enteredBy } : null;

  const systems = [{ key: 'CM', label: 'ICD-10-CM', sys: [0] }];
  if (set.hasPCS) systems.push({ key: 'PCS', label: 'ICD-10-PCS', sys: [1] });
  if (set.hasLines) systems.push({ key: 'CPT', label: 'CPT / HCPCS', sys: [2, 3] });

  // ---------------------------------------------------------------- actions
  const P = set.firstListed; // 'primary' (OP) or 'principal' (IP)
  const hasFirst = draft.dx.some((x) => x.cls === P);
  const currentFirst = draft.dx.find((x) => x.cls === P);
  const newDx = (code, desc, cls) => ({ id: uid('d'), code, desc, poa: /^Z/.test(norm(code)) && set.inpatient ? '1' : '', cls, ev: [] });
  // "Make primary / principal": the chosen code becomes the first-listed diagnosis, the old one secondary.
  const addDx = (row, principal) => {
    const code = row[2];
    change((d) => {
      const at = d.dx.findIndex((x) => norm(x.code) === norm(code));
      if (at < 0 && d.dx.length >= set.maxDx) return;
      if (principal) d.dx.forEach((x) => x.cls === P && (x.cls = 'secondary'));
      if (at > -1) {
        if (principal) d.dx[at].cls = P;
      } else d.dx.push(newDx(code, row[3], principal ? P : 'secondary'));
      d.dx = sequenceDx(d.dx, set);
    });
    if (draft.dx.length >= set.maxDx) toast(`A claim holds at most ${set.maxDx} diagnoses`);
    setEncSel(null);
    setEncQ('');
    if (set.inpatient) setTab('dx');
  };
  const addPcs = (row) => {
    if (draft.pcs.some((p) => norm(p.code) === norm(row[2]))) return toast(row[2] + ' is already coded');
    change((d) => d.pcs.push({ id: uid('p'), code: row[2], desc: row[3], date: '', ev: [] }));
    setEncSel(null);
    setEncQ('');
    setTab('pcs');
  };
  const addLine = (row) => {
    change((d) => {
      const line = { id: uid('l'), code: row[2], desc: row[3], mods: ['', '', '', ''], units: 1, ptrs: d.dx[0] ? [d.dx[0].id] : [] };
      if (isEM(norm(row[2]))) d.lines.unshift(line);
      else d.lines.push(line);
    });
    setEncSel(null);
    setEncQ('');
  };
  const actionsFor = (row) => {
    if (row[0] === 0)
      return [
        { label: draft.dx.some((x) => norm(x.code) === norm(row[2])) ? `Make ${P}` : `Add as ${P} dx`, primary: true, run: (r) => addDx(r, true) },
        { label: 'Add as secondary dx', run: (r) => addDx(r, false), disabled: draft.dx.some((x) => norm(x.code) === norm(row[2])) },
      ];
    if (row[0] === 1) return [{ label: 'Add procedure', primary: true, run: addPcs }];
    return [{ label: 'Add charge line', primary: true, run: addLine }];
  };
  // Typed code entry (CodeEntry): each box saves one code at a time. CPT / HCPCS first, then ICD.
  // A save returns an error message, or '' when the code was added.
  // The diagnosis type chosen next to the ICD-10-CM box: first-listed until there is one, then secondary.
  const entryCls = dxCls || (hasFirst ? 'secondary' : P);
  const onlyOne = (code) => `Only one ${firstTerm(set)} is allowed — ${code} is already the ${firstTerm(set)}. Edit it first, or add this code as secondary.`;
  const saveDx = (row) => {
    if (draft.dx.some((x) => norm(x.code) === norm(row[2]))) return row[2] + ' is already coded';
    if (draft.dx.length >= set.maxDx) return 'A claim holds at most ' + set.maxDx + ' diagnoses';
    if (entryCls === P && currentFirst) return onlyOne(currentFirst.code);
    change((d) => {
      // The first-listed diagnosis goes in row 1; secondary diagnoses are added at the end.
      if (entryCls === P) d.dx.unshift(newDx(row[2], row[3], P));
      else d.dx.push(newDx(row[2], row[3], 'secondary'));
    });
    setDxCls('');
    setTab('dx');
    toast(`${row[2]} added as ${entryCls === P ? firstTerm(set) : 'secondary diagnosis'}`);
    return '';
  };
  // Edit one diagnosis: its code and/or classification. Same checks as adding one.
  const editDx = (id, typedCode, cls) => {
    const row = icdRow(codeDB, typedCode);
    if (!typedCode) return 'Enter an ICD-10-CM code.';
    if (codeDB && !row) return `${typedCode} is not a valid ICD-10-CM code.`;
    if (row && !isBillable(row)) return `${row[2]} is a header code — code to the highest specificity.`;
    const code = row ? row[2] : typedCode;
    if (draft.dx.some((x) => x.id !== id && norm(x.code) === norm(code))) return code + ' is already coded';
    const other = draft.dx.find((x) => x.id !== id && x.cls === P);
    if (cls === P && other) return onlyOne(other.code);
    change((d) => {
      const x = d.dx.find((r) => r.id === id);
      if (!x) return;
      if (norm(x.code) !== norm(code)) {
        x.code = code;
        x.desc = row ? row[3] : describe(code);
        x.ev = [];
      }
      x.cls = cls;
      d.dx = sequenceDx(d.dx, set);
    });
    return '';
  };
  const savePcs = (row) => {
    if (draft.pcs.some((p) => norm(p.code) === norm(row[2]))) return row[2] + ' is already coded';
    change((d) => d.pcs.push({ id: uid('p'), code: row[2], desc: row[3], date: '', ev: [] }));
    setTab('pcs');
    return '';
  };
  const saveLine = (row) => {
    change((d) => {
      const line = { id: uid('l'), code: row[2], desc: row[3], mods: ['', '', '', ''], units: 1, ptrs: [] };
      if (isEM(norm(row[2]))) d.lines.unshift(line);
      else d.lines.push(line);
    });
    setTab('lines');
    return '';
  };
  // Entry boxes, always visible (CPT / HCPCS first, then PCS, then ICD). Saving opens the tab the code lands on.
  const entryBoxes = [
    set.hasLines && { key: 'cpt', label: 'CPT / HCPCS', sys: [2, 3], placeholder: 'e.g. 99214 or J1885', help: 'Type a procedure code and press Enter to save it as a charge line.', save: saveLine },
    set.hasPCS && { key: 'pcs', label: 'ICD-10-PCS', sys: [1], placeholder: 'e.g. 0DTJ4ZZ', help: 'Type a procedure code and press Enter to save it.', save: savePcs },
    {
      key: 'icd',
      label: 'ICD-10-CM',
      sys: [0],
      placeholder: 'e.g. J18.9',
      help: `Choose the diagnosis type, type the code and press Enter. Only one ${firstTerm(set)} is allowed; it is always sequence 1.`,
      save: saveDx,
      button: 'Add diagnosis',
      extra: (
        <select className="inp dxtype" value={entryCls} aria-label="Diagnosis type" onChange={(e) => setDxCls(e.target.value)}>
          {dxClassOptions(set).map(([v, l]) => (
            <option key={v} value={v} disabled={v === P && hasFirst}>
              {l}
              {v === P && hasFirst ? ' — already set' : ''}
            </option>
          ))}
        </select>
      ),
    },
  ].filter(Boolean);
  // Top-level tabs: one per code set (CPT first). Each shows its entry box; the sub-tabs below are shared.
  const codeSets = entryBoxes.map((b) => [b.key, b.label]);
  const activeSet = codeSets.some(([k]) => k === codeSet) ? codeSet : codeSets[0][0];
  // Opening a code set also shows the list its codes land on: CPT -> charge lines, PCS -> procedures, ICD -> diagnoses.
  const openCodeSet = (k) => {
    setCodeSet(k);
    setTab(k === 'cpt' ? 'lines' : k === 'pcs' ? 'pcs' : 'dx');
  };
  const removeDx = (id) =>
    change((d) => {
      const x = d.dx.find((r) => r.id === id);
      d.dx = d.dx.filter((r) => r.id !== id);
      d.lines.forEach((l) => (l.ptrs = l.ptrs.filter((p) => p !== id)));
      if (x) d.evidence = d.evidence.filter((e) => !x.ev.includes(e.id));
    });
  const linkEvidence = (doc, text, target) =>
    change((d) => {
      const id = uid('e');
      d.evidence.push({ id, doc, text, code: target.code });
      const row = d.dx.find((x) => x.id === target.id) || d.pcs.find((x) => x.id === target.id);
      if (row) row.ev.push(id);
    });
  // Carry a previous record's codes into this chart: diagnoses (principal first), procedures,
  // charge lines and DRG — whatever this department codes. Codes already here are skipped.
  const carryForwardCodes = (prev) => {
    const codes = prev.codes || [];
    let added = 0;
    const d = structuredClone(draftRef.current);
    {
      const has = (list, code) => list.some((x) => norm(x.code) === norm(code));
      const dxOf = codes.filter((c) => /^(PDx|SDx|Dx)$/i.test(c.type));
      dxOf
        .slice()
        .sort((a, b) => (/^PDx$/i.test(b.type) ? 1 : 0) - (/^PDx$/i.test(a.type) ? 1 : 0))
        .forEach((c) => {
          if (has(d.dx, c.code) || d.dx.length >= set.maxDx) return;
          // A previous record's PDx becomes the first-listed diagnosis only if this chart has none yet.
          const first = /^PDx$/i.test(c.type) && !d.dx.some((r) => r.cls === set.firstListed);
          const x = { id: uid('d'), code: c.code, desc: describe(c.code) || c.desc, poa: set.inpatient ? c.poa || '' : '', cls: first ? set.firstListed : 'secondary', ev: [] };
          if (first) d.dx.unshift(x);
          else d.dx.push(x);
          added += 1;
        });
      if (set.hasPCS)
        codes
          .filter((c) => /^PCS$/i.test(c.type) && !has(d.pcs, c.code))
          .forEach((c) => {
            d.pcs.push({ id: uid('p'), code: c.code, desc: describe(c.code) || c.desc, date: '', ev: [] });
            added += 1;
          });
      if (set.hasLines)
        codes
          .filter((c) => /^(CPT|HCPCS)$/i.test(c.type) && !has(d.lines, c.code))
          .forEach((c) => {
            const line = { id: uid('l'), code: c.code, desc: describe(c.code) || c.desc, mods: [...(c.mods || []), '', '', '', ''].slice(0, 4), units: c.units || 1, ptrs: d.dx[0] ? [d.dx[0].id] : [] };
            if (isEM(norm(c.code))) d.lines.unshift(line);
            else d.lines.push(line);
            added += 1;
          });
      const drg = codes.find((c) => /^DRG$/i.test(c.type));
      if (set.hasDRG && drg && !d.drg) {
        d.drg = drg.code;
        added += 1;
      }
    }
    if (added) setDraft(d);
    toast(added ? `Added ${added} code${added > 1 ? 's' : ''} from ${prev.title || "the previous record"} — review them against this visit` : 'Those codes are already on this chart');
  };
  const goEvidence = (ev) => {
    setDocKey(ev.doc);
    setDocsOpen(true);
    setFlash(null);
    setTimeout(() => setFlash(ev.id), 30);
  };
  const showInfo = (code) => {
    const row = codeDB && codeDB.find((r) => r[0] === 0 && norm(r[1]) === norm(code));
    if (row) {
      setEncSel(row);
      if (encRef.current) encRef.current.scrollIntoView({ block: 'nearest' });
    }
  };

  const leave = async (to) => {
    await saveNow();
    navigate(to);
  };
  const workAction = async (endpoint, body, message) => {
    await saveNow();
    const w = await post(endpoint, { ...body, draft: draftRef.current, timeSpent: elapsed() });
    setWork(w);
    if (message) toast(message);
    return w;
  };
  const doSubmit = async () => {
    await saveNow();
    let res;
    try {
      res = await submitChart(chart.id, { ...toSubmission(draftRef.current), draft: draftRef.current, timeSpent: elapsed() });
    } catch (e) {
      // The server re-checks the diagnoses against the chart's encounter type (422 + the rules broken).
      const details = (e && e.data && e.data.details) || [];
      if (e && e.status === 422 && details.length) throw new Error(e.message + ': ' + details.map((x) => x.message).join(' '));
      throw e;
    }
    setResult({ ...res, time: elapsed() });
    setWork((w) => ({ ...(w || {}), status: 'done' }));
    setModal(null);
  };
  const nextChart = async () => {
    try {
      const r = await get(MY_DEPT_CHARTS(dept), { params: { status: 'todo', limit: 2 } });
      const next = (r.results || []).find((c) => c.id !== chart.id);
      if (next) return navigate(coderPath(dept, next.id));
      toast('No more charts to do in this department');
    } catch (e) {
      toast('Could not load the next chart');
    }
    return navigate(deptQueuePath(dept));
  };

  // ---------------------------------------------------------------- render
  const statusText = errs
    ? ['err', `⛔ ${errs} error${errs > 1 ? 's' : ''} must be fixed`]
    : pending
      ? ['warn', '⏸ On hold — waiting for the query response']
      : openWarns
        ? ['warn', `⚠ ${openWarns} warning${openWarns > 1 ? 's' : ''} to review`]
        : ['ok', '✓ All edits cleared'];
  const linkTargets = [
    ...draft.dx.map((x) => ({ id: x.id, code: x.code, desc: x.desc })),
    ...draft.pcs.map((p) => ({ id: p.id, code: p.code, desc: p.desc })),
  ];
  const codingTabs = tabsOf(set);
  const errTab = (t) => edits.some((e) => e.sev === 'err' && e.tab === t);

  const codingBody = set.inpatient ? (
    tab === 'dx' ? (
      <DxSection draft={draft} change={change} set={set} lists={lists} evidence={draft.evidence} docs={docs} onGoEvidence={goEvidence} onInfo={showInfo} removeDx={removeDx} editDx={editDx} />
    ) : tab === 'pcs' ? (
      <PcsSection draft={draft} change={change} evidence={draft.evidence} docs={docs} onGoEvidence={goEvidence} />
    ) : tab === 'abs' ? (
      <AbstractSection draft={draft} change={change} chart={chart} lists={lists} />
    ) : (
      <DrgSection draft={draft} change={change} original={chart.original} lists={lists} />
    )
  ) : (
    tab === 'em' && set.hasEM ? (
      <EmSection draft={draft} change={change} chart={chart} describe={describe} lists={lists} />
    ) : tab === 'lines' && set.hasLines ? (
      <LinesSection draft={draft} change={change} edits={edits} original={chart.workType === 'review' ? original : null} describe={describe} lists={lists} />
    ) : (
      <DxSection draft={draft} change={change} set={set} lists={lists} evidence={draft.evidence} docs={docs} onGoEvidence={goEvidence} onInfo={showInfo} removeDx={removeDx} editDx={editDx} />
    )
  );

  return (
    <div className="wsx">
      <Header session={session} onLogout={logout} title={chart.deptName} />
      <div className="wsx-bar">
        <button type="button" className="btn sm" onClick={() => leave(deptQueuePath(dept))}>
          ← Back to chart list
        </button>
        <span className="q">
          {chart.deptName}
          <small>{chart.id}</small>
        </span>
        <span className={'pill ' + type.cls}>{type.label}</span>
        {chart.position && chart.position.index > 0 && (
          <span className="pill gray">
            Chart {chart.position.index} of {chart.position.of}
          </span>
        )}
        {work && work.status === 'deferred' && <span className="pill gray">Deferred — {(work.defer && work.defer.reason) || ''}</span>}
        {work && work.status === 'transferred' && <span className="pill gray">Transferred — {(work.transfer && work.transfer.queue) || ''}</span>}
        {chart.result && !result && <span className="pill navy">Last score {chart.result.accuracy}%</span>}
        {pending && <span className="pill warn">⏸ On hold — query pending</span>}
        <div className="sp" />
        <span className={'saved' + (saveState === 'saved' ? ' ok' : saveState === 'error' ? ' err' : '')} role="status">
          {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved — check connection' : savedAt ? 'Draft saved ' + savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Autosave on'}
        </span>
        <span className="timer" title="Time on this chart (all sessions)">
          ⏱ {fmtTime(result ? result.time : elapsed())}
        </span>
        <button
          type="button"
          className="btn sm"
          title="Open CODIVIA Code Search — your work is saved and you can come back"
          onClick={async () => {
            await saveNow();
            navigate(PATHS.codeSearch, { state: { returnTo: pathname } });
          }}
        >
          ⌕ Code Search
        </button>
      </div>
      <Banner chart={chart} set={set} />

      {result ? (
        <ResultView
          result={result.result}
          certificate={result.certificate}
          time={result.time}
          title={chart.workType === 'denial' ? 'Denial worked' : set.inpatient ? 'Audit result — ' + chart.id : chart.workType === 'review' ? 'Charges resubmitted' : 'Chart scored'}
          onReview={() => setResult(null)}
          onBack={() => navigate(deptQueuePath(dept))}
          onNext={nextChart}
        />
      ) : chart.workType === 'denial' ? (
        <div className="wsx-grid two">
          <DenialLeft chart={{ ...chart, work }} docs={docs} lists={lists} />
          <DenialRight
            chart={chart}
            draft={draft}
            change={change}
            set={set}
            describe={describe}
            edits={edits}
            evidence={draft.evidence}
            docs={docs}
            lists={lists}
            onFinish={doSubmit}
            editDx={editDx}
            onAccept={async () => {
              await saveNow();
              const w = await post(MY_CHART_SESSION(dept, chartId));
              setWork(w);
              return w.session;
            }}
          />
        </div>
      ) : (
        <div className={'wsx-grid' + (sidebar ? '' : ' closed') + (docsOpen ? '' : ' docs-closed')}>
          <DocumentsPanel
            previous={chart.previousRecords || []}
            onUseCodes={carryForwardCodes}
            open={docsOpen}
            setOpen={setDocsOpen}
            docs={docs}
            active={docKey}
            onOpen={setDocKey}
            evidence={draft.evidence}
            linkTargets={linkTargets}
            onLink={linkEvidence}
            find={find}
            setFind={setFind}
            flash={flash}
            handwritten={chart.handwritten}
            findRef={findRef}
            toast={toast}
          />
          <div className="card panel">
            <div className="ph">
              <h2>{set.ip && chart.workType === 'code' ? (set.inpatient ? 'Inpatient coding' : 'Inpatient professional coding') : type.panel}</h2>
              <div className="r">
                <span className={'pill ' + type.cls}>{type.badge}</span>
              </div>
            </div>
            {dbStatus === 'error' && (
              <div className="cv-banner degraded" style={{ position: 'static' }} role="alert">
                The code database couldn't load, so code search is unavailable.
                <button type="button" onClick={retryCodeDB}>
                  Retry
                </button>
              </div>
            )}
            {codeSets.length > 1 && (
              <div className="wsx-sets" role="tablist" aria-label="Code set">
                {codeSets.map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={activeSet === k} className={activeSet === k ? 'on' : ''} onClick={() => openCodeSet(k)}>
                    {l}
                  </button>
                ))}
              </div>
            )}
            <CodeEntry
              boxes={entryBoxes.filter((b) => b.key === activeSet)}
              allBoxes={entryBoxes}
              codeDB={codeDB}
              dbStatus={dbStatus}
              prefill={entryPrefill}
              onSwitch={(key, code) => {
                setEntryPrefill((p) => ({ key, code, n: (p ? p.n : 0) + 1 }));
                openCodeSet(key);
              }}
            />
            {codingTabs.length > 1 && (
              <div className="wsx-subtabs" role="tablist" aria-label="Coding sections">
                {codingTabs.map(([k, l], i) => (
                  <button key={k} type="button" role="tab" aria-selected={tab === k} className={'tab' + (tab === k ? ' on' : '')} title={'Alt+' + (i + 1)} onClick={() => setTab(k)}>
                    {l}
                    {k === 'dx' || k === 'pcs' || k === 'lines' ? (
                      <span className={'pill ' + (errTab(k) ? 'err' : 'gray')} style={{ padding: '0 7px', marginLeft: 5 }}>
                        {k === 'dx' ? draft.dx.length : k === 'pcs' ? draft.pcs.length : draft.lines.length}
                      </span>
                    ) : errTab(k) ? (
                      <span className="pill err" style={{ padding: '0 7px', marginLeft: 5 }}>
                        !
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
            <div className="pb">{codingBody}</div>
            <div className="abar">
              <span className={'status ' + statusText[0]}>{statusText[1]}</span>
              <div className="sp" />
              <button type="button" className="btn" onClick={() => setModal('query')}>
                Physician query
              </button>
              <button type="button" className="btn" onClick={() => setModal('defer')}>
                Defer
              </button>
              <button type="button" className="btn" onClick={() => setModal('transfer')}>
                Transfer
              </button>
              <button type="button" className="btn primary" disabled={!ready} title={ready ? '' : 'Fix errors, review warnings and wait for open queries first'} onClick={() => setModal('submit')}>
                {set.inpatient ? 'Submit for audit ▸' : chart.workType === 'review' ? 'Resubmit charges ▸' : 'Submit for scoring ▸'}
              </button>
            </div>
          </div>
          <Sidebar
            open={sidebar}
            setOpen={setSidebar}
            edits={edits}
            acks={draft.acks}
            toggleAck={(k) => change((d) => (d.acks = d.acks.includes(k) ? d.acks.filter((x) => x !== k) : [...d.acks, k].slice(-100)))}
            tabName={(t) => TAB_NAMES[t] || t}
            currentTab={tab}
            goTab={(t) => setTab(codingTabs.some(([k]) => k === t) ? t : codingTabs[0][0])}
            queries={queries}
            notes={draft.notes}
            setNotes={(v) => change((d) => (d.notes = v))}
            activity={(work && work.activity) || []}
            onComment={async (text) => setWork(await post(MY_CHART_COMMENTS(dept, chartId), { text }))}
          />
        </div>
      )}

      {modal === 'defer' && (
        <DeferModal
          reasons={lists.deferReasons || []}
          onClose={() => setModal(null)}
          onDefer={async (reason, comment) => {
            await workAction(MY_CHART_DEFER(dept, chartId), { reason, comment });
            navigate(deptQueuePath(dept));
          }}
        />
      )}
      {modal === 'transfer' && (
        <TransferModal
          queues={lists.transferQueues || []}
          reasons={lists.transferReasons || []}
          onClose={() => setModal(null)}
          onTransfer={async (queue, reason, comment) => {
            await workAction(MY_CHART_TRANSFER(dept, chartId), { queue, reason, comment });
            navigate(deptQueuePath(dept));
          }}
        />
      )}
      {modal === 'query' && (
        <QueryModal
          chart={chart}
          standardOptions={lists.queryOptions || []}
          onClose={() => setModal(null)}
          onSend={async (q) => {
            const w = await post(MY_CHART_QUERIES(dept, chartId), q);
            setWork(w);
            setModal(null);
            toast('Query sent. The chart is on hold until the physician answers.');
          }}
        />
      )}
      {modal === 'submit' && <SubmitModal draft={draft} set={set} workType={chart.workType} onClose={() => setModal(null)} onSubmit={doSubmit} />}
      {toastMsg && (
        <div className="wsx-toast" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

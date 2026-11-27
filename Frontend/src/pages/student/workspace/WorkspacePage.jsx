/* CODIVIA — coding workspace for one chart (route /charts/:dept/:chartId).
   Data: GET /my-charts/:dept/charts/:chartId — documents, encounter, what arrived with the chart
   (review / DRG / denial) and the signed-in student's saved work. No answer key.
   The work autosaves (PUT …/work). Defer / transfer / physician query / comments are server
   actions on the student's own work. Submitting is scored on the server (PUT /chart-results/:id). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { PageLoader } from '../../../components/ui/PageLoader.jsx';
import { useSession } from '../../../context/SessionContext.jsx';
import { useStudent } from '../../../context/StudentContext.jsx';
import { CodeSearchButton } from './CodeSearchPopup.jsx';
import { coderPath, deptQueuePath } from '../../../routes/paths.js';
import { get, post, put } from '../../../services/apiHelper.js';
import {
  FEE_RVU,
  MY_CHART,
  MY_CHART_COMMENTS,
  MY_CHART_DEFER,
  MY_CHART_QUERIES,
  MY_CHART_SESSION,
  MY_CHART_TRANSFER,
  MY_CHART_WORK,
  MY_DEPT_CHARTS,
} from '../../../services/endpoints.js';
import { useReference, workTypeInfo } from '../../../hooks/useReference.js';
import { DenialLeft, DenialRight } from './Denial.jsx';
import { DocumentsPanel } from './Documents.jsx';
import { fetchNotes } from './Encoder.jsx';
import { CodeEntry } from './CodeEntry.jsx';
import { runEdits } from './edits.js';
import { DeferModal, QueryModal, SubmitModal, TransferModal } from './Modals.jsx';
import {
  CODING_STEPS,
  codeDescriber,
  demographicsOf,
  documentsOf,
  dxClassOptions,
  facilityRate,
  firstTerm,
  fmtTime,
  icdRow,
  initialDraft,
  isBillable,
  isEM,
  lineStep,
  lineValues,
  norm,
  sequenceDx,
  settingOf,
  toSubmission,
  uid,
  usesSteps,
} from './model.js';
import { ResultView } from './Result.jsx';
import { AuditFeedback } from './AuditFeedback.jsx';
import {
  AbstractSection,
  ChargeList,
  DrgSection,
  DxSection,
  EmSection,
  LinesSection,
  PcsSection,
} from './Sections.jsx';
import { Sidebar } from './Sidebar.jsx';
import {
  clearLocalDraft,
  loadLocalDraft,
  OfflineBanner,
  RecoveryPrompt,
  shouldOfferRecovery,
  SyncStatus,
  useDraftSync,
  useUnsavedGuard,
} from '../../../offline/index.js';
import './workspace.css';
import {
  ActivityTabs,
  activityTabs,
  BottomBar,
  ChartReview,
  chartReviewRows,
  Demographics,
  Episode,
  FIRST_ACTIVITY,
  Flowsheets,
  medsOf,
  NO_SIDEBAR,
  PatientIQ,
  PatientMessage,
  PatientTabs,
  sectionsText,
  pinKey,
  SidePanel,
  NotesActivity,
  visitModel,
  StepStack,
  Storyboard,
  Synopsis,
  SystemBar,
  Treatments,
  visitSections,
  vitalsOf,
  WrapUp,
  useDragWidth,
} from './ehr/index.js';

const IP_TABS = [
  ['dx', 'Diagnoses'],
  ['pcs', 'Procedures (PCS)'],
  ['abs', 'Abstract'],
  ['drg', 'MS-DRG'],
];
const TAB_NAMES = {
  em: 'Level of service',
  dx: 'Diagnoses',
  lines: 'Charge lines',
  pcs: 'Procedures',
  abs: 'Abstract',
  drg: 'MS-DRG',
};
// Names of the coding steps, for the edits sidebar ("Go to …"). Charge-line edits belong to step 5.
const STEP_NAMES = {
  em: 'Step 1 · E/M',
  cpt: 'Step 2 · CPT',
  hcpcs: 'Step 3 · HCPCS',
  dx: 'Step 4 · ICD-10-CM',
  lines: 'Step 5 · Modifiers & Dx link',
  mods: 'Step 5 · Modifiers & Dx link',
};
// The coding tabs of a chart: inpatient facility as above; charts with charge lines (OP and IP
// professional) are coded in 5 steps — CPT, E/M, HCPCS, ICD-10-CM, then modifiers & Dx links.
const tabsOf = (set) =>
  set.inpatient ? IP_TABS : usesSteps(set) ? CODING_STEPS : [['dx', 'Diagnoses']];
// The entry box shown on each step, and the step each entry box (or the E/M box) belongs to.
const STEP_BOX = { cpt: 'cpt', hcpcs: 'hcpcs', dx: 'icd' };
const BOX_STEP = { cpt: 'cpt', hcpcs: 'hcpcs', icd: 'dx', pcs: 'pcs', em: 'em' };

// route: /charts/:dept/:chartId
export default function WorkspacePage() {
  const { dept, chartId } = useParams();
  const navigate = useNavigate();
  const { logout, retryCodeDB } = useSession();
  const { session, stu, codeDB, dbStatus, submitChart } = useStudent();
  const userId = session && session.user ? session.user.uid : ''; // device copies are kept per user
  const { ref: lists, error: refError, retry: retryRef } = useReference(); // option lists from the database
  const [loadError, setLoadError] = useState(''); // chart could not be loaded (not a 404)
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [chart, setChart] = useState(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [work, setWork] = useState(null); // { status, queries, activity, ... }
  const [recovery, setRecovery] = useState(null); // device copy newer than the server's draft (offline/offline)
  const [tab, setTab] = useState('dx');
  const [codeSet, setCodeSet] = useState('icd'); // top-level coding tab: cpt | pcs | icd
  const [entryPrefill, setEntryPrefill] = useState(null); // { key, code, n }: code moved from the wrong entry box
  const [docKey, setDocKey] = useState('');
  const [find, setFind] = useState('');
  const [flash, setFlash] = useState(null);
  const [encQ, setEncQ] = useState('');
  const [encSel, setEncSel] = useState(null);

  const [, setDocsOpen] = useState(false); // the Notes activity always shows the documents (kept for its callers)
  const [modal, setModal] = useState(null);
  const [activity, setActivity] = useState(FIRST_ACTIVITY); // EHR activity tab (ehr/activities/registry.js): review | episode | notes | treat | coding | wrap | iq | msg | demo | flow | synopsis
  const [sideOpen, setSideOpen] = useState(true); // right panel (Coding · Reports · Visit Report · To Do)
  const [sideTab, setSideTab] = useState('coding'); // the student codes in the right panel while reading
  // Chart Review rows shown as their own "Visit Report" tabs in the right panel (Display in Chart Sidebar).
  const [pinnedIds, setPinnedIds] = useState([]);
  const pinRow = (row) => {
    setPinnedIds((ids) => (ids.includes(row.id) ? ids : [...ids, row.id].slice(-6)));
    setSideOpen(true);
    setSideTab(pinKey(row.id));
  };
  const unpinRow = (id) => {
    setPinnedIds((ids) => ids.filter((x) => x !== id));
    setSideTab((t) => (t === pinKey(id) ? 'reports' : t));
  };
  // Right panel width: drag the bar between the record and the panel (remembered on this device).
  const sideResize = useDragWidth({
    storageKey: 'codivia.workspace.sideWidth',
    min: 320,
    maxRatio: 0.7,
  });
  const openCodingPanel = () => {
    setSideOpen(true);
    setSideTab('coding');
  };
  // ◀ ▶ through the activities opened on this chart.
  const hist = useRef({ list: [FIRST_ACTIVITY], i: 0, moving: false });
  useEffect(() => {
    const h = hist.current;
    if (h.moving) h.moving = false;
    else if (h.list[h.i] !== activity) {
      h.list = [...h.list.slice(0, h.i + 1), activity].slice(-30);
      h.i = h.list.length - 1;
    }
  }, [activity]);
  const stepHistory = (d) => {
    const h = hist.current;
    const i = h.i + d;
    if (i < 0 || i >= h.list.length) return;
    h.i = i;
    h.moving = true;
    setActivity(h.list[i]);
  };
  const [dxCls, setDxCls] = useState(''); // diagnosis type picked next to the ICD-10-CM box ('' = automatic)
  const [notes, setNotes] = useState({});
  // Medicare fee schedule prices of the codes on the claim (GET /fees/rvu); off = not available.
  const [fees, setFees] = useState({ state: 'loading', release: null, codes: {} });
  const [result, setResult] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [, tick] = useState(0);

  const encRef = useRef(null);
  const findRef = useRef(null);
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
    setRecovery(null);
    loaded.current = false;
    get(MY_CHART(dept, chartId))
      .then((c) => {
        if (!live) return;
        setChart(c);
        setWork(c.work);
        // Work saved on this device that never reached the server (power cut, offline close)?
        loadLocalDraft(userId, c.id).then((local) => {
          if (!live || !local) return;
          if (shouldOfferRecovery(local, c.work)) setRecovery(local);
          else clearLocalDraft(userId, c.id); // the server already has it (or newer)
        });
        baseTime.current = (c.work && c.work.timeSpent) || 0;
        startedAt.current = Date.now();
        // Start on the first step; skip the E/M step where this department does not offer it.
        const s0 = settingOf(c);
        setTab(usesSteps(s0) && !s0.hasEM ? 'cpt' : tabsOf(s0)[0][0]);
        setCodeSet('icd');
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
  }, [dept, chartId, loadAttempt, userId]);

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

  // ---- autosave (offline-safe: src/offline) ----
  // Every change is kept on this device at once, then sent to the server (PUT …/work); failed sends
  // retry, and resume when the connection is back. Timing and wording: chart.draftSync (server config).
  const syncLabels = (chart && chart.draftSync && chart.draftSync.labels) || {};
  const sendDraft = useCallback(
    (d, timeSpent, fetchOptions) =>
      put(MY_CHART_WORK(dept, chartId), { draft: d, timeSpent }, fetchOptions).then((r) => {
        setWork((w) => ({ ...(w || {}), status: r.status }));
        return r;
      }),
    [dept, chartId],
  );
  const sync = useDraftSync({
    userId,
    chartId: chart ? chart.id : chartId,
    deptKey: dept,
    draft,
    enabled: loaded.current,
    settings: chart && chart.draftSync,
    getTimeSpent: elapsed,
    serverSavedAt: chart && chart.work ? chart.work.savedAt : null,
    send: sendDraft,
  });
  const saveNow = sync.flush;
  // Closing the tab only needs a warning when the last changes could not be sent.
  useUnsavedGuard(
    sync.unsynced && ['offline', 'retrying', 'failed'].includes(sync.state),
    syncLabels.leaveWarning,
  );

  const restoreLocal = async () => {
    baseTime.current = Math.max(baseTime.current, recovery.timeSpent || 0);
    setDraft(recovery.draft); // the change itself syncs it to the server
    setRecovery(null);
  };
  const discardLocalCopy = async () => {
    await clearLocalDraft(userId, chart.id);
    setRecovery(null);
  };

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
          if (w.queries.filter((q) => q.answered).length > before)
            toast('The physician answered your query — see “Query Response” in Documents');
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

  // ---- fee schedule prices for the charge-line codes (fetched once per code) ----
  const lineKey = draft ? [...new Set(draft.lines.map((l) => norm(l.code)))].sort().join(',') : '';
  useEffect(() => {
    if (!lineKey || fees.state === 'off') return undefined;
    const need = lineKey.split(',').filter((c) => !(c in fees.codes));
    if (!need.length) return undefined;
    let live = true;
    get(FEE_RVU, { params: { codes: need.join(',') } })
      .then(
        (r) =>
          live &&
          setFees((f) => ({
            state: r.release ? 'ready' : 'off',
            release: r.release,
            codes: { ...f.codes, ...r.codes },
          })),
      )
      .catch(() => live && setFees((f) => ({ ...f, state: 'off' })));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineKey, fees.state]);

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
        setActivity('notes');
        setTimeout(() => {
          if (findRef.current) {
            findRef.current.focus();
            findRef.current.select();
          }
        }, 0);
      } else if (
        e.altKey &&
        /^[1-5]$/.test(e.key) &&
        chart &&
        tabsOf(settingOf(chart))[+e.key - 1]
      ) {
        e.preventDefault();
        setSideOpen(true);
        setSideTab('coding');
        setTab(tabsOf(settingOf(chart))[+e.key - 1][0]);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, chart]);

  if (!(stu.depts && stu.depts[dept] != null) || missing)
    return <Navigate to={deptQueuePath(dept)} replace />;
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
  const stepMode = usesSteps(set); // coded in 5 steps (CPT, E/M, HCPCS, ICD-10-CM, modifiers & Dx link)
  const type = workTypeInfo(lists, chart.workType || 'code');
  const queries = (work && work.queries) || [];
  const docs = documentsOf(chart, queries);
  const facility = facilityRate(chart, set);
  const lineVals = usesSteps(set) ? lineValues(draft.lines, fees, facility) : null;
  const edits = runEdits({
    chart,
    draft,
    notes,
    describe,
    lookupIcd: codeDB ? (c) => icdRow(codeDB, c) : null,
    lineVals,
  });
  const errs = edits.filter((e) => e.sev === 'err').length;
  const openWarns = edits.filter((e) => e.sev === 'warn' && !draft.acks.includes(e.key)).length;
  // Students may submit with open errors or warnings (they cost marks); only a pending physician query blocks.
  const ready = !pending;
  const original = chart.original
    ? {
        dx: chart.original.dx || [],
        lines: chart.original.lines || [],
        drg: chart.original.drg,
        enteredBy: chart.original.enteredBy,
      }
    : null;

  const systems = [{ key: 'CM', label: 'ICD-10-CM', sys: [0] }];
  if (set.hasPCS) systems.push({ key: 'PCS', label: 'ICD-10-PCS', sys: [1] });
  if (set.hasLines) systems.push({ key: 'CPT', label: 'CPT / HCPCS', sys: [2, 3] });

  // ---------------------------------------------------------------- actions
  const P = set.firstListed; // 'primary' (OP) or 'principal' (IP)
  const hasFirst = draft.dx.some((x) => x.cls === P);
  const currentFirst = draft.dx.find((x) => x.cls === P);
  const newDx = (code, desc, cls) => ({
    id: uid('d'),
    code,
    desc,
    poa: /^Z/.test(norm(code)) && set.inpatient ? '1' : '',
    cls,
    ev: [],
  });
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
    if (draft.pcs.some((p) => norm(p.code) === norm(row[2])))
      return toast(row[2] + ' is already coded');
    change((d) => d.pcs.push({ id: uid('p'), code: row[2], desc: row[3], date: '', ev: [] }));
    setEncSel(null);
    setEncQ('');
    setTab('pcs');
  };
  const addLine = (row) => {
    change((d) => {
      const line = {
        id: uid('l'),
        code: row[2],
        desc: row[3],
        mods: ['', '', '', ''],
        units: 1,
        ptrs: d.dx[0] ? [d.dx[0].id] : [],
      };
      if (isEM(norm(row[2]))) d.lines.unshift(line);
      else d.lines.push(line);
    });
    setEncSel(null);
    setEncQ('');
  };
  const actionsFor = (row) => {
    if (row[0] === 0)
      return [
        {
          label: draft.dx.some((x) => norm(x.code) === norm(row[2]))
            ? `Make ${P}`
            : `Add as ${P} dx`,
          primary: true,
          run: (r) => addDx(r, true),
        },
        {
          label: 'Add as secondary dx',
          run: (r) => addDx(r, false),
          disabled: draft.dx.some((x) => norm(x.code) === norm(row[2])),
        },
      ];
    if (row[0] === 1) return [{ label: 'Add procedure', primary: true, run: addPcs }];
    return [{ label: 'Add charge line', primary: true, run: addLine }];
  };
  // Typed code entry (CodeEntry): each box saves one code at a time. CPT / HCPCS first, then ICD.
  // A save returns an error message, or '' when the code was added.
  // The diagnosis type chosen next to the ICD-10-CM box: first-listed until there is one, then secondary.
  const entryCls = dxCls || (hasFirst ? 'secondary' : P);
  const onlyOne = (code) =>
    `Only one ${firstTerm(set)} is allowed — ${code} is already the ${firstTerm(set)}. Edit it first, or add this code as secondary.`;
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
    if (row && !isBillable(row))
      return `${row[2]} is a header code — code to the highest specificity.`;
    const code = row ? row[2] : typedCode;
    if (draft.dx.some((x) => x.id !== id && norm(x.code) === norm(code)))
      return code + ' is already coded';
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
  // A charge line is added without modifiers or diagnosis links — those are step 5.
  const saveLine = (row) => {
    change((d) => {
      const line = {
        id: uid('l'),
        code: row[2],
        desc: row[3],
        mods: ['', '', '', ''],
        units: 1,
        ptrs: [],
      };
      if (isEM(norm(row[2]))) d.lines.unshift(line);
      else d.lines.push(line);
    });
    if (!stepMode) setTab('lines');
    toast(`${row[2]} added as charge line — add modifiers and diagnosis links in step 5`);
    return '';
  };
  // The CPT step takes procedure codes; where the E/M step is offered, E/M codes are sent there.
  const saveCpt = (row) =>
    set.hasEM && isEM(norm(row[2]))
      ? {
          msg: `${row[2]} is an E/M level code. Enter it in step 1 (E/M).`,
          move: { key: 'em', label: 'step 1 (E/M)', code: row[2] },
        }
      : saveLine(row);
  // Entry boxes: CPT, HCPCS (charge-line charts), PCS (inpatient facility), ICD-10-CM.
  const entryBoxes = [
    set.hasLines && {
      key: 'cpt',
      label: 'CPT',
      sys: [2],
      placeholder: set.hasEM ? 'e.g. 20610' : 'e.g. 99214 or 20610',
      help: 'Type a CPT procedure code and press Enter. Units are set below; modifiers and diagnosis links in step 5.',
      save: saveCpt,
    },
    set.hasLines && {
      key: 'hcpcs',
      label: 'HCPCS Level II',
      sys: [3],
      placeholder: 'e.g. J1885',
      help: 'Drugs (J-codes), supplies and G-codes. Set the units below — J-code units follow the dose given.',
      save: saveLine,
    },
    set.hasPCS && {
      key: 'pcs',
      label: 'ICD-10-PCS',
      sys: [1],
      placeholder: 'e.g. 0DTJ4ZZ',
      help: 'Type a procedure code and press Enter to save it.',
      save: savePcs,
    },
    {
      key: 'icd',
      label: 'ICD-10-CM',
      sys: [0],
      placeholder: 'e.g. J18.9',
      help: `Choose the diagnosis type, type the code and press Enter. Only one ${firstTerm(set)} is allowed; it is always sequence 1.`,
      save: saveDx,
      button: 'Add diagnosis',
      extra: (
        <select
          className="inp dxtype"
          value={entryCls}
          aria-label="Diagnosis type"
          onChange={(e) => setDxCls(e.target.value)}
        >
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
  // Inpatient facility: top-level tabs, one per code set. Each shows its entry box; the sub-tabs below are shared.
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
          const x = {
            id: uid('d'),
            code: c.code,
            desc: describe(c.code) || c.desc,
            poa: set.inpatient ? c.poa || '' : '',
            cls: first ? set.firstListed : 'secondary',
            ev: [],
          };
          if (first) d.dx.unshift(x);
          else d.dx.push(x);
          added += 1;
        });
      if (set.hasPCS)
        codes
          .filter((c) => /^PCS$/i.test(c.type) && !has(d.pcs, c.code))
          .forEach((c) => {
            d.pcs.push({
              id: uid('p'),
              code: c.code,
              desc: describe(c.code) || c.desc,
              date: '',
              ev: [],
            });
            added += 1;
          });
      if (set.hasLines)
        codes
          .filter((c) => /^(CPT|HCPCS)$/i.test(c.type) && !has(d.lines, c.code))
          .forEach((c) => {
            const line = {
              id: uid('l'),
              code: c.code,
              desc: describe(c.code) || c.desc,
              mods: [...(c.mods || []), '', '', '', ''].slice(0, 4),
              units: c.units || 1,
              ptrs: d.dx[0] ? [d.dx[0].id] : [],
            };
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
    toast(
      added
        ? `Added ${added} code${added > 1 ? 's' : ''} from ${prev.title || 'the previous record'} — review them against this visit`
        : 'Those codes are already on this chart',
    );
  };
  const goEvidence = (ev) => {
    setDocKey(ev.doc);
    setDocsOpen(true);
    setActivity('notes');
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
    // Scoring happens on the server: no submitting while offline (the work stays saved on the device).
    if (typeof navigator !== 'undefined' && navigator.onLine === false)
      throw new Error(syncLabels.submitOffline);
    await saveNow();
    let res;
    try {
      res = await submitChart(chart.id, {
        ...toSubmission(draftRef.current),
        draft: draftRef.current,
        timeSpent: elapsed(),
      });
    } catch (e) {
      // The server re-checks the diagnoses against the chart's encounter type (422 + the rules broken).
      const details = (e && e.data && e.data.details) || [];
      if (e && e.status === 422 && details.length)
        throw new Error(e.message + ': ' + details.map((x) => x.message).join(' '));
      throw e;
    }
    await sync.discardLocal(); // submitted: the device copy is no longer needed
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
    ? ['err', `⛔ ${errs} error${errs > 1 ? 's' : ''} to fix`]
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
  // Steps: the charge-line edits are fixed in step 5; the sidebar names steps, not tabs.
  const editTab = (t) => (stepMode && t === 'lines' ? 'mods' : t);
  const stepCount = (k) =>
    k === 'dx'
      ? draft.dx.length
      : k === 'mods'
        ? draft.lines.length
        : draft.lines.filter((l) => lineStep(l, set) === k).length;
  // ---- step order: a step opens only when every step before it is done (rules: chart.codingSteps,
  // backend config/codingSteps.js). Steps with "codesOrNone" are done with a code or a "none" tick.
  const stepRules = (chart.codingSteps && chart.codingSteps.steps) || {};
  const stepText = (chart.codingSteps && chart.codingSteps.labels) || {};
  const noneSteps = draft.noneSteps || [];
  const stepOff = (k) => k === 'em' && !set.hasEM;
  const stepDone = (k) => {
    const rule = (stepRules[k] || {}).done;
    if (stepOff(k) || !rule || rule === 'last') return true;
    return stepCount(k) > 0 || (rule === 'codesOrNone' && noneSteps.includes(k));
  };
  const stepLocked = (k) => {
    const i = codingTabs.findIndex(([x]) => x === k);
    return codingTabs.slice(0, Math.max(0, i)).some(([x]) => !stepDone(x));
  };
  const firstOpenStep = (codingTabs.find(([k]) => !stepOff(k) && !stepDone(k)) ||
    codingTabs[codingTabs.length - 1])[0];
  // The step shown: the one asked for (Alt+n, a "Fix" link …) unless it is still locked.
  const curTab = stepMode && (stepLocked(tab) || stepOff(tab)) ? firstOpenStep : tab;
  const toggleNone = (k, on) =>
    change(
      (d) =>
        (d.noneSteps = on
          ? [...new Set([...(d.noneSteps || []), k])]
          : (d.noneSteps || []).filter((x) => x !== k)),
    );
  const fillStep = (s, vars) =>
    String(s || '').replace(/\{(\w+)\}/g, (m, v) => (vars[v] !== undefined ? vars[v] : m));
  const stepIdx = codingTabs.findIndex(([k]) => k === curTab);
  const prevStep = stepIdx > 0 ? codingTabs[stepIdx - 1] : null;
  const nextStep = stepIdx > -1 && stepIdx < codingTabs.length - 1 ? codingTabs[stepIdx + 1] : null;
  const dxSection = (
    <DxSection
      draft={draft}
      change={change}
      set={set}
      lists={lists}
      evidence={draft.evidence}
      docs={docs}
      onGoEvidence={goEvidence}
      onInfo={showInfo}
      removeDx={removeDx}
      editDx={editDx}
      letters={stepMode}
    />
  );
  const stepBody =
    curTab === 'cpt' ? (
      <ChargeList
        draft={draft}
        change={change}
        edits={edits}
        filter={(l) => lineStep(l, set) === 'cpt'}
        title="CPT procedures"
        hint={
          set.hasEM
            ? 'Procedures and services. The E/M level is step 1.'
            : 'Procedures, services and any E/M level.'
        }
        empty="No CPT codes yet. Type a CPT code in the box above and press Enter."
      />
    ) : curTab === 'em' ? (
      set.hasEM ? (
        <EmSection
          key={'em' + (entryPrefill && entryPrefill.key === 'em' ? entryPrefill.n : '')}
          initial={entryPrefill && entryPrefill.key === 'em' ? entryPrefill.code : ''}
          draft={draft}
          change={change}
          chart={chart}
          describe={describe}
          lists={lists}
        />
      ) : (
        <div className="sec">
          <div className="sh">
            <h3>Level of service (E/M)</h3>
          </div>
          <div className="empty">
            The E/M level is not a separate step in this department. If the visit has an E/M
            service, enter its code in step 2 (CPT).
          </div>
        </div>
      )
    ) : curTab === 'hcpcs' ? (
      <ChargeList
        draft={draft}
        change={change}
        edits={edits}
        filter={(l) => lineStep(l, set) === 'hcpcs'}
        title="HCPCS Level II"
        hint="Drugs, supplies and G-codes."
        empty="No HCPCS codes yet. Type a HCPCS code (e.g. J1885) in the box above and press Enter — or go on if the visit has none."
      />
    ) : curTab === 'mods' ? (
      <LinesSection
        draft={draft}
        change={change}
        edits={edits}
        original={chart.workType === 'review' ? original : null}
        describe={describe}
        lists={lists}
        grid
        values={lineVals}
        fee={{ state: fees.state, release: fees.release, facility }}
      />
    ) : (
      dxSection
    );

  const codingBody = stepMode ? (
    stepBody
  ) : set.inpatient ? (
    tab === 'dx' ? (
      <DxSection
        draft={draft}
        change={change}
        set={set}
        lists={lists}
        evidence={draft.evidence}
        docs={docs}
        onGoEvidence={goEvidence}
        onInfo={showInfo}
        removeDx={removeDx}
        editDx={editDx}
      />
    ) : tab === 'pcs' ? (
      <PcsSection
        draft={draft}
        change={change}
        evidence={draft.evidence}
        docs={docs}
        onGoEvidence={goEvidence}
      />
    ) : tab === 'abs' ? (
      <AbstractSection draft={draft} change={change} chart={chart} lists={lists} />
    ) : (
      <DrgSection draft={draft} change={change} original={chart.original} lists={lists} />
    )
  ) : tab === 'em' && set.hasEM ? (
    <EmSection draft={draft} change={change} chart={chart} describe={describe} lists={lists} />
  ) : tab === 'lines' && set.hasLines ? (
    <LinesSection
      draft={draft}
      change={change}
      edits={edits}
      original={chart.workType === 'review' ? original : null}
      describe={describe}
      lists={lists}
    />
  ) : (
    <DxSection
      draft={draft}
      change={change}
      set={set}
      lists={lists}
      evidence={draft.evidence}
      docs={docs}
      onGoEvidence={goEvidence}
      onInfo={showInfo}
      removeDx={removeDx}
      editDx={editDx}
    />
  );

  // ---- EHR shell: activities ----
  const openNotes = (key) => {
    if (key) setDocKey(key);
    setDocsOpen(true);
    setActivity('notes');
  };
  // Coding happens in the right panel's Coding tab, beside whatever the student is reading.
  const goCoding = (t) => {
    openCodingPanel();
    if (t) setTab(codingTabs.some(([k]) => k === editTab(t)) ? editTab(t) : codingTabs[0][0]);
  };
  const showSide = sideOpen && !result && !NO_SIDEBAR.includes(activity);
  const submitLabel = set.inpatient
    ? 'Submit for audit'
    : chart.workType === 'review'
      ? 'Resubmit charges'
      : 'Submit for scoring';
  const reviewRows = chartReviewRows(chart, docs);
  // Tab list and order: ehr/activities/registry.js; the page adds live counts and labels.
  const activities = activityTabs(chart, {
    notes: { count: docs.length },
    msg: { count: queries.filter((q) => !q.answered).length },
  });
  const visitSecs = visitSections(docs);
  const visitVitals = vitalsOf(sectionsText(visitSecs));
  const badges = (
    <>
      <div className="chip enc">{type.label}</div>
      {chart.position && chart.position.index > 0 && (
        <div className="chip ok">
          Chart {chart.position.index} of {chart.position.of}
        </div>
      )}
      {work && work.status === 'deferred' && (
        <div className="chip pend">Deferred — {(work.defer && work.defer.reason) || ''}</div>
      )}
      {work && work.status === 'transferred' && (
        <div className="chip pend">
          Transferred — {(work.transfer && work.transfer.queue) || ''}
        </div>
      )}
      {chart.result && !result && (
        <div className="chip score">
          {chart.result.audit ? 'Audited score' : 'Last score'} {chart.result.accuracy}%
        </div>
      )}
      {pending && <div className="chip pend">On hold — query pending</div>}
    </>
  );

  const codeEntry = (
    <CodeEntry
      boxes={entryBoxes.filter((b) => b.key === (stepMode ? STEP_BOX[curTab] : activeSet))}
      allBoxes={entryBoxes}
      codeDB={codeDB}
      dbStatus={dbStatus}
      prefill={entryPrefill}
      onSwitch={(key, code) => {
        setEntryPrefill((p) => ({ key, code, n: (p ? p.n : 0) + 1 }));
        if (stepMode) setTab(BOX_STEP[key] || 'cpt');
        else openCodeSet(key);
      }}
    />
  );
  // Step mode: the steps one under another; only the open step shows its entry box and list.
  const curRule = stepRules[curTab] || {};
  const curDone = stepDone(curTab);
  const stepStack = (
    <StepStack
      active={curTab}
      onOpen={setTab}
      steps={codingTabs.map(([k, l], i) => {
        const n = stepCount(k);
        const before = codingTabs.slice(0, i).find(([x]) => !stepDone(x));
        return {
          key: k,
          label: l,
          count: stepOff(k) ? 0 : n,
          bad: errTab(k === 'mods' ? 'lines' : k),
          state: stepOff(k)
            ? 'off'
            : before
              ? 'locked'
              : stepDone(k) && (stepRules[k] || {}).done !== 'last'
                ? 'done'
                : 'open',
          summary: stepOff(k)
            ? 'Not a separate step in this department'
            : !n && noneSteps.includes(k)
              ? stepText.noneChosen
              : k === 'dx'
                ? draft.dx.map((x) => x.code).join(', ')
                : draft.lines
                    .filter((x) => k === 'mods' || lineStep(x, set) === k)
                    .map((x) => x.code)
                    .join(', '),
          lockedText: before
            ? fillStep(stepText.locked, { n: codingTabs.indexOf(before) + 1, label: before[1] })
            : '',
        };
      })}
    >
      {codeEntry}
      {codingBody}
      {curRule.done === 'codesOrNone' && !stepCount(curTab) && (
        <label className="ehr-none">
          <input
            type="checkbox"
            checked={noneSteps.includes(curTab)}
            onChange={(e) => toggleNone(curTab, e.target.checked)}
          />{' '}
          {curRule.none}
        </label>
      )}
      <div className="wsx-stepnav">
        {prevStep && (
          <button type="button" className="btn sm" onClick={() => setTab(prevStep[0])}>
            ‹ Back: {prevStep[1]}
          </button>
        )}
        <div className="sp" />
        {!curDone && (
          <span className="ehr-stephint">
            {curRule.done === 'codes'
              ? curRule.need
              : fillStep(stepText.needCodes, { none: curRule.none })}
          </span>
        )}
        {nextStep ? (
          <button
            type="button"
            className="btn sm primary"
            disabled={!curDone}
            onClick={() => setTab(nextStep[0])}
          >
            {fillStep(stepText.next, { label: nextStep[1] }) || 'Next: ' + nextStep[1]} ›
          </button>
        ) : (
          <button type="button" className="btn sm primary" onClick={() => setActivity('wrap')}>
            {stepText.finish || 'Wrap-Up'} ›
          </button>
        )}
      </div>
    </StepStack>
  );
  const codingCard = (
    <div className="card panel">
      <div className="ph">
        <h2>
          {set.ip && chart.workType === 'code'
            ? set.inpatient
              ? 'Inpatient coding'
              : 'Inpatient professional coding'
            : type.panel}
        </h2>
        <div className="r">
          <span className={'pill ' + type.cls}>{type.badge}</span>
        </div>
      </div>
      {stepMode && stepStack}
      {!stepMode && codeSets.length > 1 && (
        <div className="wsx-sets" role="tablist" aria-label="Code set">
          {codeSets.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={activeSet === k}
              className={activeSet === k ? 'on' : ''}
              onClick={() => openCodeSet(k)}
            >
              {l}
            </button>
          ))}
        </div>
      )}
      {!stepMode && codeEntry}
      {!stepMode && codingTabs.length > 1 && (
        <div className="wsx-subtabs" role="tablist" aria-label="Coding sections">
          {codingTabs.map(([k, l], i) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={'tab' + (tab === k ? ' on' : '')}
              title={'Alt+' + (i + 1)}
              onClick={() => setTab(k)}
            >
              {l}
              {k === 'dx' || k === 'pcs' || k === 'lines' ? (
                <span
                  className={'pill ' + (errTab(k) ? 'err' : 'gray')}
                  style={{ padding: '0 7px', marginLeft: 5 }}
                >
                  {k === 'dx'
                    ? draft.dx.length
                    : k === 'pcs'
                      ? draft.pcs.length
                      : draft.lines.length}
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
      {!stepMode && <div className="pb">{codingBody}</div>}
    </div>
  );

  // A function, so it is only built after a submit (result is null until then).
  const resultView = () => (
    <ResultView
      result={result.result}
      certificate={result.certificate}
      time={result.time}
      title={
        chart.workType === 'denial'
          ? 'Denial worked'
          : set.inpatient
            ? 'Audit result — ' + chart.id
            : chart.workType === 'review'
              ? 'Charges resubmitted'
              : 'Chart scored'
      }
      onReview={() => setResult(null)}
      onBack={() => navigate(deptQueuePath(dept))}
      onNext={nextChart}
    />
  );
  // Each activity tab's screen (keys from ehr/activities/registry.js). Only the open one is rendered.
  const views = {
    review: () => (
      <ChartReview
        rows={reviewRows}
        find={find}
        onOpenNotes={openNotes}
        onUseCodes={carryForwardCodes}
        onRoute={() => setModal('query')}
        onClose={() => stepHistory(-1)}
        visitOf={(row) => visitModel({ chart, docs, draft, row: row.prev ? row : null })}
        onPin={pinRow}
      />
    ),
    episode: () => <Episode chart={chart} rows={reviewRows} onOpenNotes={openNotes} />,
    // The old Documents panel (Documents.jsx) is no longer used here; notes are listed by type and date.
    notes: () => (
      <NotesActivity
        rows={reviewRows}
        find={find}
        setFind={setFind}
        findRef={findRef}
        docKey={docKey}
        onSelectDoc={setDocKey}
        onRoute={() => setModal('query')}
        onUseCodes={carryForwardCodes}
        handwritten={chart.handwritten}
      />
    ),
    treat: () => <Treatments docs={docs} find={find} />,
    // Denial charts only: the claim, remit and account history (the denial work is in the right panel).
    coding: () => (
      <div className="ehr-denialleft">
        <DenialLeft chart={{ ...chart, work }} docs={docs} lists={lists} />
      </div>
    ),
    wrap: () => (
      <WrapUp
        chart={chart}
        draft={draft}
        set={set}
        edits={edits}
        acks={draft.acks}
        queries={queries}
        onGo={goCoding}
        onSubmit={() => setModal('submit')}
        submitLabel={submitLabel}
        ready={ready}
        onDefer={() => setModal('defer')}
        onTransfer={() => setModal('transfer')}
        onQuery={() => setModal('query')}
      />
    ),
    iq: () => <PatientIQ docs={docs} find={find} />,
    msg: () => <PatientMessage queries={queries} onNew={() => setModal('query')} />,
    demo: () => <Demographics chart={chart} onClose={() => stepHistory(-1)} />,
    flow: () => <Flowsheets chart={chart} docs={docs} />,
    synopsis: () => (
      <Synopsis
        chart={chart}
        set={set}
        docs={docs}
        workLabel={type.label}
        onOpenNotes={openNotes}
      />
    ),
  };
  const stage = (result ? resultView : views[activity] || views[FIRST_ACTIVITY])();

  // Right panel › Coding: the coding steps (or, for a denial, the denial work-up).
  const codingPanel =
    chart.workType === 'denial' ? (
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
    ) : (
      codingCard
    );
  // Right panel › To Do, under the task list: the edits / scrubber panel (acknowledge, notes, comments).
  const editsPanel = (
    <Sidebar
      open
      setOpen={() => {}}
      edits={edits}
      acks={draft.acks}
      toggleAck={(k) =>
        change(
          (d) =>
            (d.acks = d.acks.includes(k)
              ? d.acks.filter((x) => x !== k)
              : [...d.acks, k].slice(-100)),
        )
      }
      tabName={(t) => (stepMode ? STEP_NAMES[t] : TAB_NAMES[t]) || t}
      currentTab={stepMode && tab === 'mods' ? 'lines' : tab}
      goTab={(t) =>
        setTab(codingTabs.some(([k]) => k === editTab(t)) ? editTab(t) : codingTabs[0][0])
      }
      queries={queries}
      notes={draft.notes}
      setNotes={(v) => change((d) => (d.notes = v))}
      activity={(work && work.activity) || []}
      onComment={async (text) => setWork(await post(MY_CHART_COMMENTS(dept, chartId), { text }))}
    />
  );

  return (
    <div className="wsx ehr">
      <SystemBar
        user={session && session.user ? session.user.name : ''}
        onQueue={() => leave(deptQueuePath(dept))}
        onLogout={logout}
        codeSearch={<CodeSearchButton codeDB={codeDB} dbStatus={dbStatus} />}
        sync={<SyncStatus sync={sync} labels={syncLabels} onRetry={saveNow} />}
        timer={fmtTime(result ? result.time : elapsed())}
        onSearch={(q) => {
          setFind(q);
          openNotes();
        }}
        counters={[
          { label: 'Open Edits', n: errs + openWarns, onClick: () => setActivity('wrap') },
          { label: 'Queries', n: queries.length, onClick: () => setActivity('wrap') },
        ]}
      />
      <PatientTabs
        name={(chart.patient && chart.patient.name) || ''}
        chartId={chart.id}
        onClose={() => leave(deptQueuePath(dept))}
      />
      <div className="ehr-body">
        <Storyboard
          chart={chart}
          set={set}
          demo={demographicsOf(chart)}
          dxList={draft.dx}
          lines={draft.lines}
          badges={badges}
          vitals={visitVitals}
          medCount={medsOf(visitSecs).length}
          alertText={pending ? 'Physician query pending' : type.label}
          onProfile={() => setActivity('demo')}
        />
        <div className="ehr-main">
          <ActivityTabs
            tabs={activities}
            active={result ? '' : activity}
            onTab={(k) => (setResult(null), setActivity(k))}
            onBack={() => stepHistory(-1)}
            onForward={() => stepHistory(1)}
            canBack={hist.current.i > 0}
            canForward={hist.current.i < hist.current.list.length - 1}
          />
          <OfflineBanner text={syncLabels.offlineBanner} />
          {recovery && draft && !result && (
            <RecoveryPrompt
              local={recovery}
              labels={syncLabels}
              onRestore={restoreLocal}
              onDiscard={discardLocalCopy}
            />
          )}
          {chart.result && chart.result.audit && !result && (
            <AuditFeedback audit={chart.result.audit} />
          )}
          {dbStatus === 'error' && (
            <div className="cv-banner degraded" style={{ position: 'static' }} role="alert">
              The code database couldn't load, so code search is unavailable.
              <button type="button" onClick={retryCodeDB}>
                Retry
              </button>
            </div>
          )}
          <div
            className={
              'ehr-split' + (showSide ? ' with-side' + (sideTab === 'coding' ? ' wide' : '') : '')
            }
            style={
              showSide && sideResize.width ? { '--side-w': sideResize.width + 'px' } : undefined
            }
          >
            <div className="ehr-stage">{stage}</div>
            {showSide && (
              <div
                className="ehr-resizer"
                title="Drag to resize · double-click to reset"
                {...sideResize.handleProps}
              >
                <i className="bi bi-grip-vertical" aria-hidden="true" />
              </div>
            )}
            {showSide && (
              <SidePanel
                chart={chart}
                docs={docs}
                draft={draft}
                edits={edits}
                acks={draft.acks}
                errs={errs}
                pending={pending}
                queries={queries}
                onOpenNotes={openNotes}
                onWrap={() => setActivity('wrap')}
                onGo={goCoding}
                onHide={() => setSideOpen(false)}
                tab={sideTab}
                onTab={setSideTab}
                coding={codingPanel}
                codingCount={errs || openWarns}
                codingTone={errs ? 'err' : openWarns ? 'warn' : ''}
                todoExtra={editsPanel}
                pinned={pinnedIds.map((id) => reviewRows.find((r) => r.id === id)).filter(Boolean)}
                onUnpin={unpinRow}
                onUseCodes={carryForwardCodes}
              />
            )}
            {!showSide && !result && !NO_SIDEBAR.includes(activity) && (
              <button
                type="button"
                className="ehr-sideopen"
                onClick={() => setSideOpen(true)}
                title="Show sidebar"
                aria-label="Show sidebar"
              >
                <i className="bi bi-chevron-double-left" />
              </button>
            )}
          </div>
        </div>
      </div>
      {!result && (
        <BottomBar
          dxCount={draft.dx.length}
          onAddDx={() => goCoding('dx')}
          status={statusText}
          actions={[
            {
              label: 'Physician Query',
              icon: 'bi-chat-left-dots',
              onClick: () => setModal('query'),
            },
            { label: 'Defer', icon: 'bi-pause-circle', onClick: () => setModal('defer') },
            { label: 'Transfer', icon: 'bi-arrow-left-right', onClick: () => setModal('transfer') },
            { label: 'Wrap-Up', icon: 'bi-check2-square', onClick: () => setActivity('wrap') },
          ]}
          submit={
            <button
              type="button"
              className="ehr-sign"
              disabled={!ready}
              title={ready ? '' : 'Wait for the answer to your physician query first'}
              onClick={() => setModal('submit')}
            >
              <i className="bi bi-check-lg" /> {submitLabel}
            </button>
          }
        />
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
      {modal === 'submit' && (
        <SubmitModal
          draft={draft}
          set={set}
          workType={chart.workType}
          errs={errs}
          warns={openWarns}
          onClose={() => setModal(null)}
          onSubmit={doSubmit}
        />
      )}
      {toastMsg && (
        <div className="wsx-toast" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

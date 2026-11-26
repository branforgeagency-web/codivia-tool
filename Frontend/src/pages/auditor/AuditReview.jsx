/* CODIVIA platform — auditor: audit one student's submitted chart (route: /auditor/review/:studentId/:chartId).
   Left: the chart's documents (read-only). Right: the student's codes next to the answer key, the
   automatic grading checklist, the student's queries / comments, and the audit form (findings,
   verdict — agree with the auto-score or adjust it — and feedback to the student).
     GET /audits/:studentId/:chartId   chart (with answer key) + submission + checks + audit so far
     PUT /audits/:studentId/:chartId   { resultAt, verdict, finalAccuracy, findings, feedback, complete }
   Completing sets the student's official score. Styles: .au-* in refinements.css */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { PATHS, auditReviewPath } from '../../routes/paths.js';
import { get, put } from '../../services/apiHelper.js';
import { AUDIT, AUDIT_QUEUE } from '../../services/endpoints.js';
import { accTone } from '../../utils/progress.js';
import { useAuditMeta } from '../../hooks/useAuditMeta.js';
import { StatusBadge, fmtDate, useWorkTypeLabel } from './auditUi.jsx';

const norm = (s) => String(s || '').toUpperCase().replace(/[\s.]/g, '');
// "visitType" -> "Visit type", "mrn" -> "MRN" (short keys are acronyms).
const fieldLabel = (k) => (k.length <= 3 ? k.toUpperCase() : k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()));
const fmtTime = (sec) => {
  const s = Number(sec) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- documents (read-only) ----------
function DocumentViewer({ chart }) {
  const docs = useMemo(() => {
    const own = chart.documents && chart.documents.length ? chart.documents : [{ key: 'record', title: 'Medical record', sub: '', body: chart.record || '' }];
    const prev = (chart.previousRecords || []).map((r, i) => ({ key: 'prev' + i, title: 'Previous: ' + (r.title || 'record'), sub: [r.dos, r.provider].filter(Boolean).join(' · '), body: r.body || '' }));
    return [...own, ...prev];
  }, [chart]);
  const [active, setActive] = useState(0);
  const [find, setFind] = useState('');
  const doc = docs[active] || docs[0];
  const re = find.trim().length > 1 ? new RegExp('(' + escapeRe(find.trim()) + ')', 'ig') : null;

  return (
    <section className="card au-docs">
      <div className="au-doc-tabs" role="tablist" aria-label="Documents">
        {docs.map((d, i) => (
          <button key={d.key} type="button" role="tab" aria-selected={i === active} className={i === active ? 'on' : ''} onClick={() => setActive(i)}>
            {d.title}
          </button>
        ))}
      </div>
      <div className="au-doc-find">
        <i className="bi bi-search" aria-hidden="true" />
        <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find in document…" aria-label="Find in document" />
      </div>
      {doc.sub && <p className="au-doc-sub">{doc.sub}</p>}
      <div className="au-doc-body">
        {String(doc.body || '')
          .split('\n')
          .map((line, i) => {
            const heading = /^[A-Z][A-Z0-9 /&(),'-]{2,}:/.test(line.trim());
            const parts = re ? line.split(re) : [line];
            return (
              <p key={i} className={heading ? 'h' : ''}>
                {parts.map((p, j) => (re && j % 2 === 1 ? <mark key={j}>{p}</mark> : p))}
                {!line && ' '}
              </p>
            );
          })}
      </div>
    </section>
  );
}

// ---------- student's codes vs the answer key ----------
// One row per code: in both (ok), only the student's (extra), or only the key's (missed).
function compareRows(studentRows, keyRows) {
  const keyBy = new Map(keyRows.map((k) => [norm(k.code), k]));
  const used = new Set();
  const out = studentRows.map((s) => {
    const k = keyBy.get(norm(s.code));
    if (k) used.add(norm(k.code));
    return { student: s, key: k || null, state: k ? 'ok' : 'extra' };
  });
  keyRows.filter((k) => !used.has(norm(k.code))).forEach((k) => out.push({ student: null, key: k, state: 'missed' }));
  return out;
}

const STATE = { ok: ['✓', 'In key'], extra: ['✕', 'Not in key'], missed: ['!', 'Missed'] };

function CompareTable({ title, rows, studentDetail, keyDetail }) {
  if (!rows.length) return null;
  return (
    <div className="au-cmp">
      <h4>{title}</h4>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Student</th>
            <th>Answer key</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={'st-' + r.state}>
              <td>{r.student ? i + 1 : ''}</td>
              <td>
                {r.student ? (
                  <>
                    <b className="as-mono">{r.student.code}</b>
                    {studentDetail && <small>{studentDetail(r.student)}</small>}
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td>
                {r.key ? (
                  <>
                    <b className="as-mono">{r.key.code}</b> <span className="muted">{r.key.type}</span>
                    <small>{r.key.desc}</small>
                    {keyDetail && keyDetail(r.key) && <small>{keyDetail(r.key)}</small>}
                    {r.key.why && <small className="au-why">{r.key.why}</small>}
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td>
                <span className={'au-st ' + r.state} title={STATE[r.state][1]}>
                  {STATE[r.state][0]} {STATE[r.state][1]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Details shown under a code: classification, POA, modifiers, units, diagnosis pointers — whatever the row has.
const codeDetail = (r) =>
  [
    r.cls,
    r.poa && 'POA ' + r.poa,
    r.mods && r.mods.filter(Boolean).length ? 'Mod ' + r.mods.filter(Boolean).join(', ') : '',
    r.units ? r.units + ' unit(s)' : '',
    r.ptrs && r.ptrs.length ? 'Dx ' + r.ptrs.join(', ') : '',
  ]
    .filter(Boolean)
    .join(' · ');

// One table per answer-key group from GET /audits/meta (keyGroups): group.types = answer-key row
// types, group.field = where the submission holds those codes (a list, or a single value like drg).
function CodeComparison({ chart, sub, groups }) {
  const key = chart.answerKey || [];
  const meta = chart.keyMeta || {};
  const submitted = (field) => {
    const v = field ? sub[field] : null;
    if (!Array.isArray(v)) return v ? [{ code: String(v).trim().split(/[\s—–-]+/)[0], text: String(v) }] : []; // e.g. drg "291 Heart failure…"
    return v.map((x) => (typeof x === 'string' ? { code: x } : x)).filter((x) => x && x.code);
  };
  // keyMeta holds graded extras that are not codes (disposition, denial decision …), shown generically.
  const extras = Object.keys(meta)
    .filter((k) => meta[k] != null && typeof meta[k] !== 'object')
    .map((k) => [fieldLabel(k), sub[k] || '—', meta[k] || '—', !meta[k] || String(meta[k]) === String(sub[k])]);

  return (
    <>
      {groups.map((g) => {
        const keyRows = key.filter((k) => g.types.includes(k.type));
        if (!g.field) {
          return keyRows.length ? (
            <div key={g.key} className="au-cmp">
              <h4>{g.label}</h4>
              <p className="au-why">{keyRows.map((m) => `${m.code} — ${m.desc}`).join(' · ')}</p>
            </div>
          ) : null;
        }
        return <CompareTable key={g.key} title={g.label} rows={compareRows(submitted(g.field), keyRows)} studentDetail={codeDetail} keyDetail={codeDetail} />;
      })}
      {extras.length > 0 && (
        <div className="au-cmp">
          <h4>Other graded fields</h4>
          <table>
            <tbody>
              {extras.map(([label, s, k, ok]) => (
                <tr key={label} className={'st-' + (ok ? 'ok' : 'extra')}>
                  <td>{label}</td>
                  <td>{s}</td>
                  <td>{k}</td>
                  <td>
                    <span className={'au-st ' + (ok ? 'ok' : 'extra')}>{ok ? '✓' : '✕'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sub.comment && (
        <div className="au-cmp">
          <h4>Student’s claim comment</h4>
          <p>{sub.comment}</p>
        </div>
      )}
    </>
  );
}

// ---------- audit form ----------
function AuditForm({ data, meta, onSaved }) {
  const L = meta.limits;
  const { result, audit, findingTypes, chart } = data;
  const completed = audit.status === 'completed';
  const [verdict, setVerdict] = useState(audit.verdict || '');
  const [score, setScore] = useState(audit.finalAccuracy != null && audit.verdict === 'adjusted' ? String(audit.finalAccuracy) : '');
  const [findings, setFindings] = useState(audit.findings || []);
  const [feedback, setFeedback] = useState(audit.feedback || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [conflict, setConflict] = useState(false);

  // Codes offered in the finding's code box: the student's and the answer key's.
  const codes = useMemo(() => {
    const s = result.submission || {};
    return [...new Set([...(s.dx || []).map((d) => d.code), ...(s.lines || []).map((l) => l.code), ...(s.pcs || []), ...(chart.answerKey || []).map((k) => k.code)].filter(Boolean).map((c) => String(c).toUpperCase()))];
  }, [result, chart]);

  const setFinding = (i, patch) => setFindings((list) => list.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const finalScore = verdict === 'agree' ? result.autoAccuracy : verdict === 'adjusted' && score !== '' ? Number(score) : null;

  const save = async (complete) => {
    setError('');
    setFieldErrors({});
    const errs = {};
    if (complete && !verdict) errs.verdict = 'Choose whether you agree with the automatic score or adjust it.';
    if (verdict === 'adjusted' && complete && (score === '' || Number(score) < 0 || Number(score) > 100)) errs.finalAccuracy = 'Enter the audited score (0–100).';
    if (verdict === 'adjusted' && complete && !feedback.trim()) errs.feedback = 'Explain the score adjustment to the student.';
    if (Object.keys(errs).length) return setFieldErrors(errs);
    setBusy(complete ? 'complete' : 'draft');
    try {
      await put(AUDIT(data.student.uid, chart.id), {
        resultAt: result.at,
        verdict: verdict || null,
        finalAccuracy: verdict === 'adjusted' && score !== '' ? Math.round(Number(score)) : null,
        findings: findings.filter((f) => f.type).map((f) => ({ code: (f.code || '').trim(), type: f.type, comment: (f.comment || '').trim() })),
        feedback: feedback.trim(),
        complete,
      });
      onSaved(complete);
    } catch (e) {
      if (e.status === 409) setConflict(true);
      const details = (e.data && e.data.details) || [];
      if (details.length) setFieldErrors(Object.fromEntries(details.map((d) => [d.field.replace(/^body\./, ''), d.message])));
      setError(e.message || 'Could not save the audit.');
    }
    setBusy('');
  };

  return (
    <section className="card au-form">
      <header>
        <h3>Audit</h3>
        <StatusBadge status={audit.status} priority={result.priority} />
      </header>
      {audit.reaudit && <p className="ma-note">The student submitted this chart again after an earlier audit. Audit the new submission.</p>}

      <div className="au-sec">
        <h4>Findings</h4>
        {findings.length === 0 && <p className="sc-none">No findings yet. Add one for each coding error you confirm in the documentation.</p>}
        {findings.map((f, i) => (
          <div key={i} className="au-finding">
            <input list="au-codes" value={f.code || ''} onChange={(e) => setFinding(i, { code: e.target.value.toUpperCase() })} placeholder="Code" aria-label="Code" maxLength={L.code} />
            <select value={f.type} onChange={(e) => setFinding(i, { type: e.target.value })} aria-label="Finding type">
              {findingTypes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <button type="button" className="sc-icon" onClick={() => setFindings((l) => l.filter((_, j) => j !== i))} aria-label="Remove finding" title="Remove">
              <i className="bi bi-trash" aria-hidden="true" />
            </button>
            <textarea value={f.comment || ''} onChange={(e) => setFinding(i, { comment: e.target.value })} placeholder="What is wrong, and what the documentation supports…" rows={2} maxLength={L.findingComment} />
          </div>
        ))}
        <datalist id="au-codes">
          {codes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button type="button" className="sc-ghost" onClick={() => setFindings((l) => [...l, { code: '', type: findingTypes[0].key, comment: '' }])} disabled={findings.length >= L.findings}>
          <i className="bi bi-plus-lg" aria-hidden="true" /> Add finding
        </button>
      </div>

      <div className="au-sec">
        <h4>Score</h4>
        <div className="au-verdict" role="radiogroup" aria-label="Verdict">
          {meta.verdicts.map((v) => (
            <label key={v.key} className={verdict === v.key ? 'on' : ''}>
              <input type="radio" name="verdict" checked={verdict === v.key} onChange={() => setVerdict(v.key)} />
              <span>
                <b>{v.label}</b> — {v.hint}
                {v.key === 'agree' ? ` (${result.autoAccuracy}%)` : ''}
              </span>
              {v.key === 'adjusted' && verdict === 'adjusted' && (
                <span className="au-score-in">
                  <input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} aria-label="Audited score" /> %
                </span>
              )}
            </label>
          ))}
        </div>
        {fieldErrors.verdict && <em className="au-err">{fieldErrors.verdict}</em>}
        {fieldErrors.finalAccuracy && <em className="au-err">{fieldErrors.finalAccuracy}</em>}
        {finalScore != null && (
          <p className="ma-note">
            Official score after this audit: <b className={'acc-' + accTone(finalScore)}>{finalScore}%</b>
            {finalScore !== result.autoAccuracy ? ` (auto ${result.autoAccuracy}%)` : ''}. The student sees the score, your findings and feedback.
          </p>
        )}
      </div>

      <div className="au-sec">
        <h4>Feedback to the student</h4>
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} maxLength={L.feedback} placeholder="Summary of the audit: what was coded well, what to fix, which guideline applies…" />
        {fieldErrors.feedback && <em className="au-err">{fieldErrors.feedback}</em>}
      </div>

      {error && (
        <div className="cvx-msg err" role="alert">
          {error}
          {conflict && (
            <button type="button" className="sc-ghost" style={{ marginLeft: 8 }} onClick={() => window.location.reload()}>
              Reload
            </button>
          )}
        </div>
      )}
      <div className="au-actions">
        {!completed && (
          <button type="button" className="sc-ghost" onClick={() => save(false)} disabled={!!busy}>
            {busy === 'draft' ? 'Saving…' : 'Save draft'}
          </button>
        )}
        <button type="button" className="dc-action" onClick={() => save(true)} disabled={!!busy}>
          {busy === 'complete' ? 'Saving…' : completed ? 'Update audit' : 'Complete audit'}
        </button>
      </div>
      {completed && audit.completedAt && <p className="au-foot-note">Completed {fmtDate(audit.completedAt)}. Updating it changes the student’s score at once.</p>}
    </section>
  );
}

function Checklist({ checks }) {
  const [open, setOpen] = useState(false);
  if (!checks || !checks.length) return null;
  const failed = checks.filter((c) => !c.ok).length;
  return (
    <section className="card au-checks">
      <button type="button" className="au-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <b>Automatic grading checklist</b>
        <span>
          {checks.length - failed} of {checks.length} checks passed
        </span>
        <i className={'bi ' + (open ? 'bi-chevron-up' : 'bi-chevron-down')} aria-hidden="true" />
      </button>
      {open &&
        checks.map((c, i) => (
          <div key={i} className="wsx-chk">
            <span className={'i ' + (c.ok ? 'y' : 'n')}>{c.ok ? '✓' : '✕'}</span>
            <div>
              <b>{c.title}</b>
              {c.why && <p>{c.why}</p>}
            </div>
          </div>
        ))}
    </section>
  );
}

function WorkNotes({ work }) {
  if (!work || (!work.queries.length && !work.comments.length)) return null;
  return (
    <section className="card au-notes">
      <h3>Student’s queries & comments</h3>
      {work.queries.map((q, i) => (
        <div key={'q' + i} className="au-note">
          <small>
            Physician query to {q.to} · {fmtDate(q.sentAt)}
          </small>
          <p>{q.question}</p>
          {q.answer && <p className="au-why">Answer: {q.answer}</p>}
        </div>
      ))}
      {work.comments.map((c, i) => (
        <div key={'c' + i} className="au-note">
          <small>Comment · {fmtDate(c.at)}</small>
          <p>{c.text}</p>
        </div>
      ))}
    </section>
  );
}

export default function AuditReview() {
  const meta = useAuditMeta();
  const workTypeLabel = useWorkTypeLabel();
  const { studentId, chartId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    get(AUDIT(studentId, chartId))
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e.message || 'Could not load the chart'));
    return () => {
      cancelled = true;
    };
  }, [studentId, chartId, tick]);

  const onSaved = async (complete) => {
    if (!complete) {
      setDone('Draft saved.');
      setTick((t) => t + 1);
      return;
    }
    setDone('Audit completed. The student’s score is updated.');
    setTick((t) => t + 1);
  };

  const nextChart = async () => {
    try {
      const r = await get(AUDIT_QUEUE, { params: { status: 'pending', limit: 2 } });
      const next = r.results.find((x) => !(x.student.uid === studentId && x.chart === chartId));
      if (next) navigate(auditReviewPath(next.student.uid, next.chart));
      else navigate(PATHS.auditorQueue);
    } catch {
      navigate(PATHS.auditorQueue);
    }
  };

  if (error)
    return (
      <div className="ad">
        <button type="button" className="backbtn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="cvx-msg err" role="alert">
          {error}
        </div>
      </div>
    );
  if (!data || !meta) return <PageLoader variant="inline" label="Loading chart" />;

  const { chart, student, result, work } = data;
  const sub = result.submission || (work && work.draft) || {};
  const enc = chart.encounter || {};

  return (
    <div className="ad au-review">
      <div className="au-top">
        <button type="button" className="backbtn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="au-title">
          <h1>
            {chart.id} <span>· {chart.title}</span>
          </h1>
          <p>
            <b>{student.name}</b> ({student.id}) · {chart.deptName} · {workTypeLabel(chart.workType)} ·{' '}
            {chart.encounterType === 'IP' ? 'Inpatient' + (chart.billingType ? ' ' + chart.billingType : '') : 'Outpatient'} · Submitted {fmtDate(result.at)}
            {work ? ' · Time on chart ' + fmtTime(work.timeSpent) : ''}
          </p>
        </div>
        <div className={'wsx-ring ' + (result.autoAccuracy >= 90 ? 'hi' : result.autoAccuracy >= 70 ? 'mid' : 'lo')} title="Automatic score">
          {result.autoAccuracy}%
        </div>
      </div>
      {done && (
        <div className="cvx-msg ok au-done" role="status">
          {done}
          <button type="button" className="dc-action" onClick={nextChart}>
            Next chart to audit →
          </button>
        </div>
      )}

      <div className="au-patient">
        <span>
          <b>Patient</b> {chart.patient ? `${chart.patient.name}, ${chart.patient.age}${chart.patient.sex}` : '—'}
        </span>
        {Object.keys(enc).filter((k) => enc[k] != null && enc[k] !== '' && typeof enc[k] !== 'object').map((k) => (
          <span key={k}>
            <b>{fieldLabel(k)}</b> {String(enc[k])}
          </span>
        ))}
        <span>
          <b>Difficulty</b> {chart.difficulty}
        </span>
      </div>

      <div className="au-split">
        <DocumentViewer chart={chart} />
        <div className="au-side">
          <section className="card">
            <h3>Student’s codes vs answer key</h3>
            {!result.submission && <p className="ma-note">This chart was submitted before audits kept the full submission; showing the student’s last saved work.</p>}
            <CodeComparison chart={chart} sub={sub} groups={meta.keyGroups} />
            {result.audit == null && result.miss && result.miss.length > 0 && <p className="au-why">Missed at grading: {result.miss.join(', ')}</p>}
          </section>
          <Checklist checks={result.checks} />
          <WorkNotes work={work} />
          <AuditForm key={data.audit.status + (data.audit.updatedAt || '')} data={data} meta={meta} onSaved={onSaved} />
        </div>
      </div>
    </div>
  );
}

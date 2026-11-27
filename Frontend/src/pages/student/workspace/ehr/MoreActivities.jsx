/* CODIVIA EHR shell — Episode, Treatments, Demographics and Flowsheets activities, and the Chart
   Review side report (index, alert, visit counters, insurance, vitals). All read from the chart. */
import { useState } from 'react';
import { parseRecordSections } from '../recordSections.js';
import { medsOf, typeIcon, VITAL_LIST, vitalsOf } from './chartReviewData.js';
import { ReportView } from './ReportView.jsx';

const textOf = (sections) => sections.map((s) => s.head + '\n' + (s.body || '')).join('\n');
const docSections = (docs) =>
  (
    docs.find((d) => d.key === 'full') || {
      sections: docs.filter((d) => !d.isQuery).flatMap((d) => d.sections),
    }
  ).sections;
const Kv = ({ rows }) => (
  <table className="ehr-kv">
    <tbody>
      {rows
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([l, v]) => (
          <tr key={l}>
            <th>{l}</th>
            <td>{v}</td>
          </tr>
        ))}
    </tbody>
  </table>
);

// bare: inside the sidebar (SidePanel), which has its own toolbar and "Current as of" line.
export function SideReport({
  chart,
  docs,
  draft,
  errs,
  pending,
  queries,
  onOpenNotes,
  onWrap,
  bare,
}) {
  const [at, setAt] = useState(() => new Date());
  const e = chart.encounter || {};
  const vit = vitalsOf(textOf(docSections(docs)));
  const notes = docs.filter((d) => !d.isQuery).length;
  return (
    <div className={bare ? '' : 'ehr-side'}>
      {!bare && (
        <>
          <div className="ehr-side-tb">
            <button
              type="button"
              className="ehr-x"
              onClick={() => setAt(new Date())}
              title="Refresh"
            >
              <i className="bi bi-arrow-clockwise" />
            </button>
            <span className="tag">Coding</span>
          </div>
          <p className="ehr-asof" onClick={() => setAt(new Date())}>
            Current as of{' '}
            {at.toLocaleString([], {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
            . Click to refresh.
          </p>
        </>
      )}
      <section className="ehr-scard">
        <h5>Index</h5>
        <div className="ehr-index">
          {docs.map((d) => (
            <button
              key={d.key}
              type="button"
              className="ehr-link"
              onClick={() => onOpenNotes(d.key)}
            >
              {d.title}
            </button>
          ))}
        </div>
      </section>
      {(pending || errs > 0) && (
        <button type="button" className="ehr-alertbar" onClick={onWrap}>
          <i className="bi bi-exclamation-circle-fill" />{' '}
          {pending
            ? 'A physician query is pending — the chart is on hold'
            : `${errs} claim edit${errs > 1 ? 's' : ''} must be fixed before billing`}
          <span>Open Wrap-Up</span>
        </button>
      )}
      <section className="ehr-scard">
        <h5>Visit Counters</h5>
        <div className="ehr-counters">
          <div>Encounter Count: {1 + (chart.previousRecords || []).length}</div>
          <div>Progress Note Count: {notes}</div>
          <div>Diagnoses Coded: {draft.dx.length}</div>
          <div>Charge Lines: {draft.lines.length}</div>
          <div>Queries: {queries.length}</div>
        </div>
      </section>
      <section className="ehr-scard">
        <h5>Active Insurance{e.dos ? ' as of ' + e.dos : ''}</h5>
        {e.payer ? (
          <Kv
            rows={[
              ['Payer', e.payer],
              ['Plan', e.plan],
              ['Member ID', e.member],
            ]}
          />
        ) : (
          <p className="ehr-small">Patient has no active insurance coverage on file.</p>
        )}
      </section>
      <section className="ehr-scard">
        <h5>Review Flowsheet</h5>
        {Object.keys(vit).length ? (
          <Kv
            rows={VITAL_LIST.map((v) => [
              v.label,
              vit[v.key] &&
                vit[v.key] + (v.unit && !/[a-z%°]$/i.test(vit[v.key]) ? ' ' + v.unit : ''),
            ])}
          />
        ) : (
          <div className="ehr-nodata">
            <i className="bi bi-info-circle" /> No data to display
          </div>
        )}
      </section>
    </div>
  );
}

export function Episode({ chart, rows, onOpenNotes }) {
  const encs = rows
    .filter((r) => r.tab === 'enc')
    .sort((a, b) => (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0));
  const ep = rows.find((r) => r.tab === 'episodes');
  return (
    <div className="ehr-act">
      <div className="ehr-acthead">
        <h2>Episode</h2>
        <span className="ehr-sub">{ep ? ep.cells.desc : ''}</span>
      </div>
      <div className="ehr-cards">
        <section className="ehr-card">
          <h4>
            <i className="bi bi-collection" /> Episode Summary
          </h4>
          <Kv
            rows={[
              ['Episode', ep && ep.cells.desc],
              ['Status', ep && ep.cells.status],
              ['Start', ep && ep.when],
              ['Department', chart.deptName],
              ['Provider', (chart.encounter || {}).provider],
              ['Encounter type', chart.encounterType === 'IP' ? 'Inpatient' : 'Outpatient'],
            ]}
          />
        </section>
      </div>
      <section className="ehr-card">
        <h4>
          <i className="bi bi-calendar3" /> Encounters in this episode
        </h4>
        <table className="ehr-table compact">
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>With</th>
              <th>Description</th>
              <th>Chief Complaint / Reason</th>
            </tr>
          </thead>
          <tbody>
            {encs.map((r) => (
              <tr key={r.id} onDoubleClick={() => r.doc && onOpenNotes(r.doc)}>
                <td>{r.when || '—'}</td>
                <td>
                  <i className={'bi ' + typeIcon(r.cells.type) + ' ehr-ti'} />
                  {r.cells.type}
                </td>
                <td>{r.cells.with}</td>
                <td>{r.cells.desc}</td>
                <td>{r.cells.cc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function Treatments({ docs, find }) {
  const secs = docSections(docs);
  const meds = medsOf(secs);
  const plan = secs.filter((s) =>
    /PLAN|PROCEDURE|OPERATIVE|TREATMENT|DISPOSITION|DISCHARGE/i.test(s.head),
  );
  return (
    <div className="ehr-act">
      <div className="ehr-acthead">
        <h2>Treatments</h2>
        <span className="ehr-sub">
          Medications, procedures and the plan documented for this visit
        </span>
      </div>
      <section className="ehr-card">
        <h4>
          <i className="bi bi-capsule" /> Current Medications ({meds.length})
        </h4>
        {meds.length ? (
          <ul className="ehr-medlist">
            {meds.map((m, i) => (
              <li key={i}>
                <i className="bi bi-capsule-pill" /> {m}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ehr-note">No medications documented.</p>
        )}
      </section>
      <section className="ehr-card">
        <h4>
          <i className="bi bi-clipboard2-check" /> Plan &amp; Procedures
        </h4>
        {plan.length ? (
          <ReportView sections={plan} find={find} />
        ) : (
          <p className="ehr-note">No plan or procedure section in this chart.</p>
        )}
      </section>
    </div>
  );
}

// Demographics: one section per tab (Basics, Employer and Identification …) stacked like the EHR;
// the tab links jump to a section. Tabs, groups and labels come from the server (chart.demographics).
// The pencil opens a section form; edits are for practice only and stay on this screen.
export function Demographics({ chart, onClose }) {
  const layout = chart.demographics || { tabs: [], fields: [], valueLabels: {} };
  const [active, setActive] = useState((layout.tabs[0] || {}).key);
  const [editing, setEditing] = useState(null);
  const [local, setLocal] = useState({}); // practice edits: { fieldKey: value }
  const [draftVals, setDraftVals] = useState({});
  const p = chart.patient || {};
  const details = p.details || {};
  const raw = (f) => {
    if (f.key in local) return local[f.key];
    if (!f.from) return details[f.key] || '';
    const [obj, k] = f.from.split('.');
    const v = ((obj === 'patient' ? p : chart.encounter) || {})[k];
    return (
      (layout.valueLabels[k] && layout.valueLabels[k][v]) ||
      (v === undefined || v === null ? '' : String(v))
    );
  };
  const fieldsOf = (tab) => layout.fields.filter((f) => f.tab === tab);
  const groupsOf = (tab) => [...new Set(fieldsOf(tab).map((f) => f.group))];
  const jump = (key) => {
    setActive(key);
    const el = document.getElementById('demo-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const startEdit = (key) => {
    setEditing(key);
    setActive(key);
    setDraftVals(Object.fromEntries(fieldsOf(key).map((f) => [f.key, raw(f)])));
  };
  const move = (dir) => {
    const i = layout.tabs.findIndex((t) => t.key === editing);
    const next = layout.tabs[i + dir];
    if (next) startEdit(next.key);
  };
  const shown = (v) => v || '—';

  return (
    <div className="ehr-act ehr-demo">
      <div className="ehr-acthead">
        <h2>Demographics</h2>
        <div className="sp" />
        {onClose && (
          <button type="button" className="ehr-x" onClick={onClose} aria-label="Close Demographics">
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>
      <nav className="ehr-demonav" aria-label="Demographics sections">
        {layout.tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={active === t.key ? 'on' : ''}
            onClick={() => jump(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {layout.tabs.map((t) => {
        const isEdit = editing === t.key;
        const basics = t.key === layout.tabs[0].key;
        const head = basics ? fieldsOf(t.key).filter((f) => !f.group) : [];
        return (
          <section
            key={t.key}
            id={'demo-' + t.key}
            className={'ehr-demosec' + (active === t.key ? ' focus' : '')}
            onClick={() => setActive(t.key)}
          >
            <h3>
              {t.label}
              {!isEdit && (
                <button
                  type="button"
                  className="ehr-pencil"
                  onClick={() => startEdit(t.key)}
                  aria-label={'Edit ' + t.label}
                  title="Edit"
                >
                  <i className="bi bi-pencil" />
                </button>
              )}
            </h3>
            {isEdit ? (
              <div className="ehr-demoform">
                <p className="ehr-small">
                  Practice edit: changes show on this screen only and are not saved to the chart.
                </p>
                {groupsOf(t.key).map((g) => (
                  <div key={g || 'main'} className="grp">
                    {g && <h4>{g}</h4>}
                    <div className="grid">
                      {fieldsOf(t.key)
                        .filter((f) => f.group === g)
                        .map((f) => (
                          <label key={f.key}>
                            <span>{f.label}</span>
                            <input
                              className="ehr-input"
                              value={draftVals[f.key] || ''}
                              readOnly={!!f.from}
                              onChange={(e) =>
                                setDraftVals((d) => ({ ...d, [f.key]: e.target.value }))
                              }
                            />
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
                <div className="acts">
                  <button
                    type="button"
                    className="ehr-btn"
                    onClick={() => (
                      setLocal((l) => ({
                        ...l,
                        ...Object.fromEntries(
                          fieldsOf(t.key)
                            .filter((f) => !f.from)
                            .map((f) => [f.key, draftVals[f.key] || '']),
                        ),
                      })),
                      setEditing(null)
                    )}
                  >
                    <i className="bi bi-check-lg" /> Close
                  </button>
                  <button type="button" className="ehr-btn" onClick={() => setEditing(null)}>
                    <i className="bi bi-x-lg" /> Cancel
                  </button>
                  <div className="sp" />
                  <button
                    type="button"
                    className="ehr-btn"
                    disabled={layout.tabs[0].key === t.key}
                    onClick={() => move(-1)}
                  >
                    <i className="bi bi-arrow-up" /> Previous
                  </button>
                  <button
                    type="button"
                    className="ehr-btn"
                    disabled={layout.tabs[layout.tabs.length - 1].key === t.key}
                    onClick={() => move(1)}
                  >
                    <i className="bi bi-arrow-down" /> Next
                  </button>
                </div>
              </div>
            ) : (
              <>
                {basics && (
                  <div className="ehr-demohead">
                    <div className="sil" aria-hidden="true">
                      <i className="bi bi-person-fill" />
                    </div>
                    {head.map((f) => (
                      <div key={f.key} className="fv">
                        <span>{f.label}</span>
                        <b>{shown(raw(f))}</b>
                      </div>
                    ))}
                  </div>
                )}
                {groupsOf(t.key)
                  .filter((g) => !(basics && !g))
                  .map((g) => (
                    <div key={g || 'main'} className="grp">
                      {g && <h4>{g}</h4>}
                      <div className="grid">
                        {fieldsOf(t.key)
                          .filter((f) => f.group === g)
                          .map((f) => (
                            <div key={f.key} className="fv">
                              <span>{f.label}</span>
                              <b>{shown(raw(f))}</b>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </>
            )}
          </section>
        );
      })}
      {!layout.tabs.length && (
        <p className="ehr-note">Demographics are not available for this chart.</p>
      )}
    </div>
  );
}

// PatientIQ: what the patient reported (questionnaire-style answers documented in the record).
export function PatientIQ({ docs, find }) {
  const secs = docSections(docs).filter((s) =>
    /REVIEW OF SYSTEMS|\bROS\b|SOCIAL|FAMILY|CHIEF COMPLAINT|HISTORY OF PRESENT|PATIENT.REPORTED|QUESTIONNAIRE|PAIN/i.test(
      s.head,
    ),
  );
  return (
    <div className="ehr-act">
      <div className="ehr-acthead">
        <h2>PatientIQ</h2>
        <span className="ehr-sub">Patient-reported information documented for this visit</span>
      </div>
      <section className="ehr-card">
        <h4>
          <i className="bi bi-ui-checks" /> Questionnaires
        </h4>
        <p className="ehr-note">No questionnaires were filed for this encounter.</p>
      </section>
      <section className="ehr-card">
        <h4>
          <i className="bi bi-chat-square-quote" /> Patient-reported history
        </h4>
        {secs.length ? (
          <ReportView sections={secs} find={find} />
        ) : (
          <p className="ehr-note">Nothing patient-reported in this chart.</p>
        )}
      </section>
    </div>
  );
}

// Patient Message: no patient portal messages exist for practice charts; physician queries are the
// messages a coder sends, so they are listed here too.
export function PatientMessage({ queries, onNew }) {
  return (
    <div className="ehr-act">
      <div className="ehr-acthead">
        <h2>Patient Message</h2>
      </div>
      <section className="ehr-card">
        <h4>
          <i className="bi bi-envelope" /> Patient Messages
        </h4>
        <p className="ehr-note">No patient messages for this encounter.</p>
      </section>
      <section className="ehr-card">
        <div className="ehr-card-h">
          <h4>
            <i className="bi bi-chat-left-dots" /> Physician Queries ({queries.length})
          </h4>
          <button type="button" className="ehr-btn" onClick={onNew}>
            <i className="bi bi-plus-lg" /> New query
          </button>
        </div>
        {queries.length ? (
          <ul className="ehr-edits">
            {queries.map((q) => (
              <li key={q.id} className={q.answered ? 'ok' : 'warn'}>
                <b>{q.to || 'Physician'}</b> — {q.question}
                {q.answered ? (
                  <div className="ans">↳ {q.answer}</div>
                ) : (
                  <div className="ans pend">Awaiting response</div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ehr-note">No queries sent.</p>
        )}
      </section>
    </div>
  );
}

export function Flowsheets({ chart, docs }) {
  // Columns: this visit, then each earlier encounter that has vital signs in its record.
  const cols = [
    {
      label: 'This Visit',
      sub: (chart.encounter || {}).dos || '',
      v: vitalsOf(textOf(docSections(docs))),
    },
  ].concat(
    (chart.previousRecords || [])
      .map((r) => ({
        label: r.title,
        sub: r.dos || '',
        v: vitalsOf(textOf(parseRecordSections(r.body || ''))),
      }))
      .filter((c) => Object.keys(c.v).length),
  );
  const any = cols.some((c) => Object.keys(c.v).length);
  return (
    <div className="ehr-act">
      <div className="ehr-acthead">
        <h2>Flowsheets</h2>
        <span className="ehr-sub">Vital signs documented in the record</span>
      </div>
      <section className="ehr-card">
        <h4>
          <i className="bi bi-activity" /> Vitals
        </h4>
        {any ? (
          <table className="ehr-table compact flow">
            <thead>
              <tr>
                <th>Measure</th>
                {cols.map((c, i) => (
                  <th key={i}>
                    {c.label}
                    <small>{c.sub}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VITAL_LIST.map((m) => (
                <tr key={m.key}>
                  <th>
                    {m.label} {m.unit && <small>({m.unit})</small>}
                  </th>
                  {cols.map((c, i) => (
                    <td key={i}>{c.v[m.key] || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="ehr-note">No vital signs found in this chart.</p>
        )}
      </section>
    </div>
  );
}

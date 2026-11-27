/* CODIVIA EHR shell — right sidebar shown next to the activities: Reports (Regulatory · Med/Hx ·
   Clinical), Visit Report (this encounter at a glance) and To Do (what is left before submitting). */
import { useState } from 'react';
import { medsOf, VITAL_LIST, vitalsOf } from './chartReviewData.js';
import { SideReport } from './MoreActivities.jsx';

const initials = (name) =>
  String(name || '?')
    .replace(/^dr\.?\s*/i, '')
    .split(/[,\s]+/)
    .filter((w) => w && !/^(md|do|np|pa|rn)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
const visitSections = (docs) =>
  (
    docs.find((d) => d.key === 'full') || {
      sections: docs.filter((d) => !d.isQuery).flatMap((d) => d.sections),
    }
  ).sections;
const asOf = (d) =>
  d.toLocaleString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

function MedHx({ chart, docs }) {
  const secs = visitSections(docs);
  const meds = medsOf(secs);
  const hx = secs.filter((s) => /PAST MEDICAL|PAST SURGICAL|FAMILY|SOCIAL/i.test(s.head));
  const e = chart.encounter || {};
  return (
    <>
      <section className="ehr-scard">
        <h5>Current Medications ({meds.length})</h5>
        {meds.length ? (
          meds.map((m, i) => (
            <div key={i} className="ehr-li">
              {m}
            </div>
          ))
        ) : (
          <p className="ehr-small">No medications documented.</p>
        )}
      </section>
      <section className="ehr-scard">
        <h5>Allergies</h5>
        <div
          className={'ehr-li' + (e.allergy && !/^nkda|^no known/i.test(e.allergy) ? ' alert' : '')}
        >
          {e.allergy || 'Not on File'}
        </div>
      </section>
      {hx.map((s, i) => (
        <section key={i} className="ehr-scard">
          <h5>
            {s.head
              .replace(/^./, (c) => c)
              .toLowerCase()
              .replace(/(^|\s)\S/g, (c) => c.toUpperCase())}
          </h5>
          <p className="ehr-small pre">{s.body}</p>
        </section>
      ))}
      {(chart.previousRecords || []).length > 0 && (
        <section className="ehr-scard">
          <h5>Previously Billed Codes</h5>
          {chart.previousRecords.map((r, i) => (
            <div key={i} className="ehr-li">
              <b>{r.dos}</b> {r.title}: {(r.codes || []).map((c) => c.code).join(', ') || '—'}
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function Clinical({ docs }) {
  const secs = visitSections(docs);
  const vit = vitalsOf(secs.map((s) => s.head + '\n' + (s.body || '')).join('\n'));
  const labs = secs.filter((s) => /LAB|PATHOLOG|IMAGING|RADIOLOG|DIAGNOSTIC/i.test(s.head));
  return (
    <>
      <section className="ehr-scard">
        <h5>Vitals</h5>
        {Object.keys(vit).length ? (
          VITAL_LIST.filter((v) => vit[v.key]).map((v) => (
            <div key={v.key} className="ehr-li">
              <span className="k">{v.label}</span> {vit[v.key]}
            </div>
          ))
        ) : (
          <div className="ehr-nodata">
            <i className="bi bi-info-circle" /> No data to display
          </div>
        )}
      </section>
      {labs.map((s, i) => (
        <section key={i} className="ehr-scard">
          <h5>{s.head}</h5>
          <p className="ehr-small pre">{s.body}</p>
        </section>
      ))}
    </>
  );
}

function VisitReport({ chart, docs, draft, onGo }) {
  const e = chart.encounter || {};
  const secs = visitSections(docs);
  // Medication changes = plan sentences that start, stop or change a medicine.
  const medChanges = secs
    .filter((s) => /PLAN|DISCHARGE/i.test(s.head))
    .flatMap((s) => String(s.body || '').split(/(?<=\.)\s+/))
    .filter((t) =>
      /\b(start|started|stop|discontinue|increase|decrease|switch|prescribe|continue)\b/i.test(t),
    )
    .map((t) => t.trim());
  const first = draft.dx[0];
  return (
    <div className="ehr-visitrep">
      <h1>
        {e.visitType || (chart.encounterType === 'IP' ? 'Hospital Encounter' : 'Office Visit')}
      </h1>
      <div className="fac">{[e.facility, chart.deptName].filter(Boolean).join(', ')}</div>
      <div className="who">
        <span className="pav">{initials(e.provider)}</span>
        <div>
          <b>{e.provider || 'Provider not on file'}</b>
          <small>{e.specialty || chart.deptName}</small>
        </div>
        {first && (
          <div className="dx">
            <b>{first.desc || first.code}</b>
            <small>Dx</small>
          </div>
        )}
      </div>
      <div className="cards">
        <div className="vcard">
          <h3>Orders Placed</h3>
          {draft.lines.length ? (
            draft.lines.map((l) => (
              <div key={l.id}>
                {l.code} {l.desc}
              </div>
            ))
          ) : (
            <div>None</div>
          )}
        </div>
        <div className="vcard">
          <h3>Medication Changes</h3>
          {medChanges.length ? medChanges.map((t, i) => <div key={i}>{t}</div>) : <div>None</div>}
        </div>
      </div>
      <h2>Visit Diagnoses</h2>
      {draft.dx.length ? (
        draft.dx.map((d) => (
          <div key={d.id} className="vdx">
            <i className="bi bi-diamond-fill" /> {d.desc || d.code} <small>{d.code}</small>
          </div>
        ))
      ) : (
        <div className="vdx muted">No visit diagnoses coded yet</div>
      )}
      <button type="button" className="ehr-link big" onClick={() => onGo('dx')}>
        Problem List
      </button>
    </div>
  );
}

function ToDo({ edits, acks, draft, queries, onGo, onWrap }) {
  const tasks = [
    ...(!draft.dx.length
      ? [{ k: 'dx', sev: 'err', t: 'Code the visit diagnoses', go: () => onGo('dx') }]
      : []),
    ...queries
      .filter((q) => !q.answered)
      .map((q) => ({
        k: 'q' + q.id,
        sev: 'warn',
        t: 'Waiting for the physician: ' + q.question,
        go: onWrap,
      })),
    ...edits
      .filter((x) => x.sev === 'err' || (x.sev === 'warn' && !acks.includes(x.key)))
      .map((x) => ({ k: x.key, sev: x.sev, t: x.title + ' — ' + x.msg, go: () => onGo(x.tab) })),
  ];
  return (
    <div className="ehr-todo">
      {tasks.length ? (
        tasks.map((x) => (
          <button key={x.k} type="button" className={'task ' + x.sev} onClick={x.go}>
            <i
              className={
                'bi ' + (x.sev === 'err' ? 'bi-x-octagon-fill' : 'bi-exclamation-triangle-fill')
              }
            />
            <span>{x.t}</span>
          </button>
        ))
      ) : (
        <p className="ehr-ok">
          <i className="bi bi-check-circle-fill" /> Nothing left to do. Ready to submit.
        </p>
      )}
    </div>
  );
}

export function SidePanel(props) {
  const {
    chart,
    docs,
    draft,
    errs,
    pending,
    queries,
    edits,
    acks,
    onOpenNotes,
    onWrap,
    onGo,
    onHide,
  } = props;
  const [tab, setTab] = useState('visit');
  const [report, setReport] = useState('reg');
  const [at, setAt] = useState(() => new Date());
  const todo = errs + queries.filter((q) => !q.answered).length;
  return (
    <aside className="ehr-sidepanel" aria-label="Sidebar">
      <div className="ehr-sidetabs" role="tablist">
        {[
          ['reports', 'Reports'],
          ['visit', 'Visit Report'],
          ['todo', 'To Do' + (todo ? ` (${todo})` : '')],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? 'on' : ''}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
        <div className="sp" />
        <button
          type="button"
          className="ehr-x"
          onClick={onHide}
          aria-label="Hide sidebar"
          title="Hide sidebar"
        >
          <i className="bi bi-chevron-double-right" />
        </button>
      </div>
      {tab === 'visit' && (
        <div className="ehr-sidehead">
          <h3>Visit Report</h3>
        </div>
      )}
      <div className="ehr-side-tb">
        <button type="button" className="ehr-x" onClick={() => setAt(new Date())} title="Refresh">
          <i className="bi bi-arrow-clockwise" />
        </button>
        {tab === 'reports' &&
          [
            ['reg', 'Regulatory', 'bi-journal-check'],
            ['medhx', 'Med/Hx', 'bi-capsule'],
            ['clin', 'Clinical', 'bi-heart-pulse'],
          ].map(([k, l, ic]) => (
            <button
              key={k}
              type="button"
              className={'seg' + (report === k ? ' on' : '')}
              onClick={() => setReport(k)}
            >
              <i className={'bi ' + ic} /> {l}
            </button>
          ))}
      </div>
      <p className="ehr-asof" onClick={() => setAt(new Date())}>
        Current as of {asOf(at)}. Click to refresh.
      </p>
      <div className="ehr-side">
        {tab === 'reports' && report === 'reg' && (
          <SideReport
            chart={chart}
            docs={docs}
            draft={draft}
            errs={errs}
            pending={pending}
            queries={queries}
            onOpenNotes={onOpenNotes}
            onWrap={onWrap}
            bare
          />
        )}
        {tab === 'reports' && report === 'medhx' && <MedHx chart={chart} docs={docs} />}
        {tab === 'reports' && report === 'clin' && <Clinical docs={docs} />}
        {tab === 'visit' && <VisitReport chart={chart} docs={docs} draft={draft} onGo={onGo} />}
        {tab === 'todo' && (
          <ToDo
            edits={edits}
            acks={acks}
            draft={draft}
            queries={queries}
            onGo={onGo}
            onWrap={onWrap}
          />
        )}
      </div>
    </aside>
  );
}

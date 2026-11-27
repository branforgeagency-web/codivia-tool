/* CODIVIA EHR shell — the frame of the coding workspace, laid out like a hospital EHR:
   system bar · patient tab · storyboard (left) · activity tabs · activity · bottom action bar.
   Pure layout: every value and handler comes from WorkspacePage. */
import { BILLING_LABEL, ENCOUNTER_LABEL } from '../model.js';

const initials = (name) =>
  String(name || '?')
    .split(/[,\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .reverse()
    .join('');
const displayName = (name) => {
  const [last, first] = String(name || '')
    .split(',')
    .map((s) => s.trim());
  return first ? `${first} ${last}` : last || 'Patient';
};

export function SystemBar({
  user,
  onQueue,
  onLogout,
  codeSearch,
  sync,
  timer,
  onSearch,
  counters = [],
}) {
  return (
    <div className="ehr-sysbar">
      <span className="brand">
        <i className="bi bi-grid-3x3-gap-fill" /> CODIVIA
      </span>
      <button type="button" onClick={onQueue}>
        <i className="bi bi-list-task" /> Work Queue
      </button>
      <span className="cs">{codeSearch}</span>
      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get('q');
          if (q && onSearch) onSearch(String(q));
        }}
      >
        <i className="bi bi-search" />
        <input name="q" placeholder="Search this chart (Enter)" aria-label="Search this chart" />
      </form>
      <div className="sp" />
      {counters.map((c) => (
        <button key={c.label} type="button" className="counter" onClick={c.onClick}>
          {c.label} {c.n}
        </button>
      ))}
      <span className="sync">{sync}</span>
      <span className="timer" title="Time on this chart (all sessions)">
        <i className="bi bi-stopwatch" /> {timer}
      </span>
      <button type="button" onClick={onLogout}>
        <i className="bi bi-box-arrow-right" /> Log Out
      </button>
      <span className="me" title={user}>
        {initials(user)}
      </span>
    </div>
  );
}

export function PatientTabs({ name, chartId, onClose }) {
  return (
    <div className="ehr-pttabs">
      <span className="pt on">
        <i className="bi bi-person-vcard" /> {name || 'Patient'} <small>{chartId}</small>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chart and return to the work queue"
          title="Close chart"
        >
          <i className="bi bi-x-lg" />
        </button>
      </span>
    </div>
  );
}

// Left storyboard: who the patient is and what this encounter is about.
export function Storyboard({
  chart,
  set,
  demo,
  dxList,
  lines,
  badges,
  vitals = {},
  medCount = 0,
  alertText,
  onProfile,
}) {
  const p = chart.patient || {};
  const e = chart.encounter || {};
  const sex = p.sex === 'F' ? 'Female' : p.sex === 'M' ? 'Male' : p.sex || '';
  const allergy = e.allergy || '';
  const alertAllergy = allergy && !/^nkda|^no known/i.test(allergy);
  const row = (label, value) =>
    value ? (
      <div className="kv">
        <span>{label}:</span> {value}
      </div>
    ) : null;
  return (
    <aside className="ehr-story" aria-label="Patient storyboard">
      {/* Clicking the photo or name opens Demographics, as in the EHR. */}
      <button
        type="button"
        className="avatar"
        onClick={onProfile}
        title="Open Demographics"
        aria-label="Open Demographics"
      >
        {initials(p.name)}
      </button>
      <button type="button" className="name" onClick={onProfile} title="Open Demographics">
        {displayName(p.name)}
      </button>
      <div className="line">
        {sex}
        {p.age !== undefined && p.age !== '' ? `, ${p.age} y.o.` : ''}
      </div>
      {e.mrn && <div className="line">MRN: {e.mrn}</div>}
      {e.acct && <div className="line">Acct: {e.acct}</div>}
      {alertText && <div className="alertrow">{alertText}</div>}
      <div className={'chip ' + (alertAllergy ? 'alert' : 'ok')}>
        Allergies: {allergy || 'Not on File'}
      </div>
      <div className="chip enc">
        {set.encounterType} · {ENCOUNTER_LABEL[set.encounterType]}
        {set.ip && set.billingType ? ' · ' + BILLING_LABEL[set.billingType] : ''}
      </div>
      {badges}

      <div className="blk">
        {row('Primary Cvg', e.payer)}
        {row('Plan', e.plan)}
        {row('Member ID', e.member)}
      </div>
      {e.provider && (
        <div className="prov">
          <span className="pav" aria-hidden="true">
            {initials(e.provider.replace(/^dr\.?\s*/i, ''))}
          </span>
          <div>
            <b>{e.provider}</b>
            <small>
              {(set.ip ? 'Attending' : 'Provider') + (e.specialty ? ' · ' + e.specialty : '')}
            </small>
          </div>
        </div>
      )}
      <div className="sect">
        {set.ip ? 'Hospital Encounter' : (e.dos || '') + ' ' + (e.visitType || 'Office Visit')}
      </div>
      <div className="blk">
        {set.ip ? row('Admit', e.admit) : row('DOS', e.dos)}
        {set.ip && row('Discharge', e.discharge)}
        {set.ip && row('LOS', e.los != null && e.los !== '' ? e.los + ' days' : '')}
        {row('Patient', e.ptype === 'new' ? 'New patient' : e.ptype === 'est' ? 'Established' : '')}
        {row('Last seen', e.lastSeen)}
        {row('POS', e.pos)}
        {row('Facility', e.facility)}
        {row('Encounter', e.encounterId)}
        {demo.pairs.slice(0, 6).map((x, i) => (
          <div className="kv" key={i}>
            <span>{x.label}:</span> {x.value}
          </div>
        ))}
      </div>
      <div className="blk">
        {row('Current Meds', String(medCount))}
        <div className="kv">
          <span>Ht:</span> {vitals.ht || '—'}
        </div>
        <div className="kv">
          <span>Last Wt:</span> {vitals.wt || '—'}
        </div>
        <div className="kv">
          <span>BMI:</span> {vitals.bmi || '—'}
        </div>
        <div className="kv">
          <span>BP:</span> {vitals.bp || '—'}
        </div>
      </div>
      <div className="sect pink">Problem List ({dxList.length})</div>
      <div className="blk">
        {dxList.length ? (
          dxList.map((d) => (
            <div className="kv code" key={d.id}>
              <b>{d.code}</b> {d.desc}
            </div>
          ))
        ) : (
          <div className="kv muted">No diagnoses coded yet</div>
        )}
      </div>
      <div className="sect pink">Charges ({lines.length})</div>
      <div className="blk">
        {lines.map((l) => (
          <div className="kv code" key={l.id}>
            <b>{l.code}</b>
            {l.mods.filter(Boolean).length ? '-' + l.mods.filter(Boolean).join('-') : ''} ×
            {l.units || 1}
          </div>
        ))}
        {!lines.length && <div className="kv muted">No charges yet</div>}
      </div>
    </aside>
  );
}

// Activity tabs across the top of the workspace.
export function ActivityTabs({
  tabs,
  active,
  onTab,
  right,
  onBack,
  onForward,
  canBack,
  canForward,
}) {
  return (
    <div className="ehr-acttabs" role="tablist" aria-label="Activities">
      <span className="nav">
        <button type="button" onClick={onBack} disabled={!canBack} aria-label="Back" title="Back">
          <i className="bi bi-arrow-left" />
        </button>
        <button
          type="button"
          onClick={onForward}
          disabled={!canForward}
          aria-label="Forward"
          title="Forward"
        >
          <i className="bi bi-arrow-right" />
        </button>
      </span>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          className={(active === t.key ? 'on' : '') + (t.big ? ' big' : '')}
          onClick={() => onTab(t.key)}
          title={t.hint || ''}
        >
          {t.icon && <i className={'bi ' + t.icon + ' ic-' + t.key} />}
          {t.label}
          {t.count ? <span className={'cnt' + (t.tone ? ' ' + t.tone : '')}>{t.count}</span> : null}
        </button>
      ))}
      <div className="sp" />
      {right}
    </div>
  );
}

// Bottom action bar (Add Dx, query, defer, transfer, status, Submit).
export function BottomBar({ dxCount, onAddDx, status, actions, submit }) {
  return (
    <div className="ehr-bottom">
      <button type="button" className="ehr-bb" onClick={onAddDx}>
        <i className="bi bi-plus-lg" /> ADD DX ({dxCount})
      </button>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          className="ehr-bb"
          onClick={a.onClick}
          disabled={a.disabled}
        >
          {a.icon && <i className={'bi ' + a.icon} />} {a.label}
        </button>
      ))}
      <div className="sp" />
      <span className={'ehr-status ' + status[0]}>{status[1]}</span>
      {submit}
    </div>
  );
}

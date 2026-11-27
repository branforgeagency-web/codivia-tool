/* Left storyboard: who the patient is and what this encounter is about. The photo / name opens
   Demographics. Problem List and Charges follow the student's coding as it changes. */
import { BILLING_LABEL, ENCOUNTER_LABEL } from '../../model.js';
import {
  displayName,
  hasValue,
  initials,
  isAlertAllergy,
  patientInitials,
  sexLabel,
} from '../lib/chartText.js';

const Row = ({ label, value }) =>
  hasValue(value) ? (
    <div className="kv">
      <span>{label}:</span> {value}
    </div>
  ) : null;

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
  return (
    <aside className="ehr-story" aria-label="Patient storyboard">
      <button
        type="button"
        className="avatar"
        onClick={onProfile}
        title="Open Demographics"
        aria-label="Open Demographics"
      >
        {patientInitials(p.name)}
      </button>
      <button type="button" className="name" onClick={onProfile} title="Open Demographics">
        {displayName(p.name)}
      </button>
      <div className="line">
        {sexLabel(p.sex)}
        {hasValue(p.age) ? `, ${p.age} y.o.` : ''}
      </div>
      {e.mrn && <div className="line">MRN: {e.mrn}</div>}
      {e.acct && <div className="line">Acct: {e.acct}</div>}
      {alertText && <div className="alertrow">{alertText}</div>}
      <div className={'chip ' + (isAlertAllergy(e.allergy) ? 'alert' : 'ok')}>
        Allergies: {e.allergy || 'Not on File'}
      </div>
      <div className="chip enc">
        {set.encounterType} · {ENCOUNTER_LABEL[set.encounterType]}
        {set.ip && set.billingType ? ' · ' + BILLING_LABEL[set.billingType] : ''}
      </div>
      {badges}

      <div className="blk">
        <Row label="Primary Cvg" value={e.payer} />
        <Row label="Plan" value={e.plan} />
        <Row label="Member ID" value={e.member} />
      </div>
      {e.provider && (
        <div className="prov">
          <span className="pav" aria-hidden="true">
            {initials(e.provider)}
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
        {set.ip ? <Row label="Admit" value={e.admit} /> : <Row label="DOS" value={e.dos} />}
        {set.ip && <Row label="Discharge" value={e.discharge} />}
        {set.ip && <Row label="LOS" value={hasValue(e.los) ? e.los + ' days' : ''} />}
        <Row
          label="Patient"
          value={e.ptype === 'new' ? 'New patient' : e.ptype === 'est' ? 'Established' : ''}
        />
        <Row label="Last seen" value={e.lastSeen} />
        <Row label="POS" value={e.pos} />
        <Row label="Facility" value={e.facility} />
        <Row label="Encounter" value={e.encounterId} />
        {demo.pairs.slice(0, 6).map((x, i) => (
          <Row key={i} label={x.label} value={x.value} />
        ))}
      </div>
      <div className="blk">
        <Row label="Current Meds" value={String(medCount)} />
        <Row label="Ht" value={vitals.ht || '—'} />
        <Row label="Last Wt" value={vitals.wt || '—'} />
        <Row label="BMI" value={vitals.bmi || '—'} />
        <Row label="BP" value={vitals.bp || '—'} />
      </div>
      <div className="sect pink">Problem List ({dxList.length})</div>
      <div className="blk">
        {dxList.map((d) => (
          <div className="kv code" key={d.id}>
            <b>{d.code}</b> {d.desc}
          </div>
        ))}
        {!dxList.length && <div className="kv muted">No diagnoses coded yet</div>}
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

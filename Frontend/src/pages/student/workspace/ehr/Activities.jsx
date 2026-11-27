/* CODIVIA EHR shell — Synopsis (encounter at a glance) and Wrap-Up (charge capture review before
   submitting: visit diagnoses, charges with their errors inline, open edits, queries). */

const ENCOUNTER_FIELDS = [
  ['mrn', 'MRN'],
  ['acct', 'Account'],
  ['encounterId', 'Encounter ID'],
  ['dos', 'Date of Service'],
  ['admit', 'Admit Date'],
  ['discharge', 'Discharge Date'],
  ['los', 'Length of Stay'],
  ['provider', 'Provider'],
  ['specialty', 'Specialty'],
  ['visitType', 'Visit Type'],
  ['pos', 'Place of Service'],
  ['facility', 'Facility'],
  ['payer', 'Payer'],
  ['plan', 'Plan'],
  ['member', 'Member ID'],
  ['lastSeen', 'Last Seen'],
  ['allergy', 'Allergies'],
];

export function Synopsis({ chart, set, docs, workLabel, onOpenNotes }) {
  const e = chart.encounter || {};
  const fields = ENCOUNTER_FIELDS.filter(
    ([k]) => e[k] !== undefined && e[k] !== null && e[k] !== '',
  );
  return (
    <div className="ehr-act">
      <div className="ehr-acthead">
        <h2>Synopsis</h2>
        <span className="ehr-sub">
          {chart.deptName} · {workLabel} · {set.encounterType === 'IP' ? 'Inpatient' : 'Outpatient'}
        </span>
      </div>
      <div className="ehr-cards">
        <section className="ehr-card">
          <h4>Encounter</h4>
          <table className="ehr-kv">
            <tbody>
              {fields.map(([k, l]) => (
                <tr key={k}>
                  <th>{l}</th>
                  <td>{k === 'los' ? e[k] + ' days' : k === 'ptype' ? '' : e[k]}</td>
                </tr>
              ))}
              {e.ptype && (
                <tr>
                  <th>Patient Type</th>
                  <td>{e.ptype === 'new' ? 'New patient' : 'Established patient'}</td>
                </tr>
              )}
              {!fields.length && (
                <tr>
                  <td className="ehr-empty">No encounter details on this chart.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <section className="ehr-card">
          <h4>Documents for this visit</h4>
          <ul className="ehr-doclist">
            {docs.map((d) => (
              <li key={d.key}>
                <button type="button" className="ehr-link" onClick={() => onOpenNotes(d.key)}>
                  <i
                    className={'bi ' + (d.isQuery ? 'bi-chat-left-text' : 'bi-file-earmark-text')}
                  />{' '}
                  {d.title}
                </button>
                {d.sub && <small>{d.sub}</small>}
              </li>
            ))}
          </ul>
          {(chart.previousRecords || []).length > 0 && (
            <p className="ehr-note">
              {chart.previousRecords.length} earlier encounter(s) — see Chart Review › Encounters.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export function WrapUp({
  chart,
  draft,
  set,
  edits,
  acks,
  queries,
  onGo,
  onSubmit,
  submitLabel,
  ready,
  onDefer,
  onTransfer,
  onQuery,
}) {
  const e = chart.encounter || {};
  const letter = (i) => String.fromCharCode(65 + i);
  const dxIdx = Object.fromEntries(draft.dx.map((d, i) => [d.id, i]));
  const lineErrs = (n) => edits.filter((x) => x.line === n);
  const open = edits.filter((x) => x.sev === 'err' || (x.sev === 'warn' && !acks.includes(x.key)));
  return (
    <div className="ehr-act">
      <div className="ehr-acthead">
        <h2>Wrap-Up</h2>
        <span className="ehr-sub">Charge capture, visit diagnoses and claim edits</span>
      </div>
      <div className="ehr-sectabs">
        <a href="#wu-dx">Visit Diagnoses</a>
        {!set.inpatient && <a href="#wu-charges">Charge Capture</a>}
        <a href="#wu-edits">Claim Edits</a>
        <a href="#wu-queries">Queries</a>
      </div>

      <section className="ehr-card" id="wu-dx">
        <div className="ehr-card-h">
          <h4>
            <i className="bi bi-clipboard2-pulse" /> Visit Diagnoses
          </h4>
          <button type="button" className="ehr-btn" onClick={() => onGo('dx')}>
            <i className="bi bi-plus-lg" /> Add
          </button>
        </div>
        <table className="ehr-table compact">
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Description</th>
              <th>Type</th>
              {set.inpatient && <th>POA</th>}
            </tr>
          </thead>
          <tbody>
            {draft.dx.map((d, i) => (
              <tr key={d.id}>
                <td>{set.inpatient ? i + 1 : letter(i)}</td>
                <td className="mono">{d.code}</td>
                <td>{d.desc}</td>
                <td>{d.cls}</td>
                {set.inpatient && <td>{d.poa || '—'}</td>}
              </tr>
            ))}
            {!draft.dx.length && (
              <tr>
                <td colSpan={5} className="ehr-empty">
                  No diagnoses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {!set.inpatient && (
        <section className="ehr-card" id="wu-charges">
          <div className="ehr-card-h">
            <h4>
              <i className="bi bi-cash-stack" /> Charge Capture
            </h4>
            <button type="button" className="ehr-btn" onClick={() => onGo('cpt')}>
              <i className="bi bi-plus-lg" /> Add charge
            </button>
          </div>
          <div className="ehr-chargehead">
            <span>
              <b>Service Date</b> {e.dos || '—'}
            </span>
            <span>
              <b>Department</b> {chart.deptName}
            </span>
            <span>
              <b>Place of Service</b> {e.pos || e.facility || '—'}
            </span>
            <span>
              <b>Service Provider</b> {e.provider || '—'}
            </span>
          </div>
          <table className="ehr-table compact charges">
            <thead>
              <tr>
                <th>Description</th>
                <th>Code</th>
                <th>Modifiers</th>
                <th>Qty</th>
                <th>Dx</th>
                <th>Service Date</th>
                <th>Service Provider</th>
              </tr>
            </thead>
            <tbody>
              {draft.lines.map((l, i) => {
                const errs = lineErrs(i + 1);
                return [
                  <tr key={l.id} className={errs.some((x) => x.sev === 'err') ? 'has-err' : ''}>
                    <td>{l.desc || '—'}</td>
                    <td className="mono">{l.code}</td>
                    <td className="mono">{l.mods.filter(Boolean).join(', ') || '—'}</td>
                    <td>{l.units || 1}</td>
                    <td className="mono">
                      {l.ptrs
                        .map((id) => (dxIdx[id] !== undefined ? letter(dxIdx[id]) : '?'))
                        .join(',') || '—'}
                    </td>
                    <td>{e.dos || '—'}</td>
                    <td>{e.provider || '—'}</td>
                  </tr>,
                  errs.length > 0 && (
                    <tr key={l.id + 'e'} className="errrow">
                      <td colSpan={7}>
                        <span className="lbl">Errors:</span>
                        {errs.map((x) => (
                          <span key={x.key} className={'ehr-errtag ' + x.sev}>
                            {x.title}
                          </span>
                        ))}
                        <button type="button" className="ehr-link" onClick={() => onGo('lines')}>
                          Fix
                        </button>
                      </td>
                    </tr>
                  ),
                ];
              })}
              {!draft.lines.length && (
                <tr>
                  <td colSpan={7} className="ehr-empty">
                    No charges to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className="ehr-card" id="wu-edits">
        <div className="ehr-card-h">
          <h4>
            <i className="bi bi-exclamation-triangle" /> Claim Edits ({open.length})
          </h4>
        </div>
        {open.length ? (
          <ul className="ehr-edits">
            {open.map((x) => (
              <li key={x.key} className={x.sev}>
                <b>{x.title}</b> — {x.msg}
                <button type="button" className="ehr-link" onClick={() => onGo(x.tab)}>
                  Go to fix
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ehr-ok">
            <i className="bi bi-check-circle-fill" /> No open edits.
          </p>
        )}
      </section>

      <section className="ehr-card" id="wu-queries">
        <div className="ehr-card-h">
          <h4>
            <i className="bi bi-chat-left-dots" /> Physician Queries ({queries.length})
          </h4>
          <button type="button" className="ehr-btn" onClick={onQuery}>
            <i className="bi bi-plus-lg" /> New query
          </button>
        </div>
        {queries.length ? (
          <ul className="ehr-edits">
            {queries.map((q) => (
              <li key={q.id} className={q.answered ? 'ok' : 'warn'}>
                <b>{q.answered ? 'Answered' : 'Pending'}</b> — {q.question}
                {q.answered && <div className="ans">↳ {q.answer}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ehr-note">No queries sent.</p>
        )}
      </section>

      <div className="ehr-wrapacts">
        <button type="button" className="ehr-btn" onClick={onDefer}>
          Defer
        </button>
        <button type="button" className="ehr-btn" onClick={onTransfer}>
          Transfer
        </button>
        <button
          type="button"
          className="ehr-btn primary"
          disabled={!ready}
          onClick={onSubmit}
          title={ready ? '' : 'Wait for the answer to your physician query first'}
        >
          <i className="bi bi-check-lg" /> {submitLabel}
        </button>
      </div>
    </div>
  );
}

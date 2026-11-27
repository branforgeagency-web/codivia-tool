/* Visit report of one encounter (model = lib/visitModel.js). Narrow (sidebar tab): header, provider,
   Orders Placed, Medication Changes, Visit Diagnoses. wide (Chart Review preview): the note text on
   the left and those cards on the right. */
import { initials } from '../lib/chartText.js';
import { ReportView } from '../ui/index.js';

function Cards({ m, onProblemList, onMedList }) {
  return (
    <>
      <div className="vcard">
        <h3>Orders Placed</h3>
        {m.orders.length ? (
          m.orders.map((o, i) => (
            <div key={i} className="vord">
              <i className="bi bi-eyedropper" /> {o.code} {o.desc}
            </div>
          ))
        ) : (
          <div>None</div>
        )}
      </div>
      <div className="vcard">
        <h3>Medication Changes</h3>
        {m.medChanges.length ? m.medChanges.map((t, i) => <div key={i}>{t}</div>) : <div>None</div>}
        {onMedList && (
          <button type="button" className="ehr-link big" onClick={onMedList}>
            Medication List
          </button>
        )}
      </div>
      <div className="vcard">
        <h2>Visit Diagnoses</h2>
        {m.diagnoses.map((d, i) => (
          <div key={i} className="vdx">
            <i className="bi bi-diamond-fill" /> {d.desc || d.code} <small>{d.code}</small>
          </div>
        ))}
        {!m.diagnoses.length && (
          <div className="vdx muted">{m.current ? 'No visit diagnoses coded yet' : 'None'}</div>
        )}
        {onProblemList && (
          <button type="button" className="ehr-link big" onClick={onProblemList}>
            Problem List
          </button>
        )}
      </div>
    </>
  );
}

export function VisitReport({ model: m, wide, find, onProblemList, onMedList, onUseCodes }) {
  return (
    <div className={'ehr-visitrep' + (wide ? ' wide' : '')}>
      <div className="vr-head">
        <h1>{m.title}</h1>
        <div className="vr-when">
          {m.date}
          {m.place && <div>{m.place}</div>}
        </div>
      </div>
      <div className="who">
        <span className="pav">{initials(m.provider)}</span>
        <div>
          <b>{m.provider || 'Provider not on file'}</b>
          {m.specialty && <small>{m.specialty}</small>}
        </div>
        {m.dx && (
          <div className="dx">
            <b>{m.dx.name}</b>
            <small>Dx</small>
          </div>
        )}
        {m.codes && onUseCodes && (
          <button type="button" className="ehr-btn" onClick={() => onUseCodes(m.codes)}>
            <i className="bi bi-box-arrow-in-down" /> Use these codes
          </button>
        )}
      </div>
      {wide ? (
        <div className="vr-grid">
          <div className="vr-notes">
            <h2 className="vr-notes-h">
              {m.noteTitle} <small>{m.noteBy}</small>
            </h2>
            <ReportView sections={m.sections} find={find} />
          </div>
          <div className="vr-side">
            <Cards m={m} onProblemList={onProblemList} onMedList={onMedList} />
          </div>
        </div>
      ) : (
        <div className="cards">
          <Cards m={m} onProblemList={onProblemList} onMedList={onMedList} />
        </div>
      )}
    </div>
  );
}

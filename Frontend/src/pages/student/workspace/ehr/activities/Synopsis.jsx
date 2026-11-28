import { hasValue } from '../lib/chartText.js';
import { ActivityHeader, Card, CardGrid, KvTable, Note } from '../ui/index.js';
import { SynopsisHistory } from './SynopsisHistory.jsx';

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
  const rows = ENCOUNTER_FIELDS.filter(([k]) => hasValue(e[k])).map(([k, l]) => [
    l,
    k === 'los' ? e[k] + ' days' : e[k],
  ]);
  if (e.ptype)
    rows.push(['Patient Type', e.ptype === 'new' ? 'New patient' : 'Established patient']);
  return (
    <div className="ehr-act">
      <ActivityHeader
        title="Synopsis"
        sub={`${chart.deptName} · ${workLabel} · ${set.encounterType === 'IP' ? 'Inpatient' : 'Outpatient'}`}
      />
      <SynopsisHistory chart={chart} docs={docs} />
      <CardGrid>
        <Card title="Encounter" icon="bi-hospital">
          {rows.length ? <KvTable rows={rows} /> : <Note>No encounter details on this chart.</Note>}
        </Card>
        <Card title="Documents for this visit" icon="bi-files">
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
            <Note>
              {chart.previousRecords.length} earlier encounter(s) — see Chart Review › Encounters.
            </Note>
          )}
        </Card>
      </CardGrid>
    </div>
  );
}

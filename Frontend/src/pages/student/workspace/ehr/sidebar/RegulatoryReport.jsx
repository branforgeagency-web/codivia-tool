/* Sidebar › Reports › Regulatory: document index, alert bar, visit counters, insurance, vitals. */
import { sectionsText, visitSections, VITAL_LIST, vitalsOf } from '../lib/chartText.js';
import { KvTable, NoData, SideCard } from '../ui/index.js';

export function RegulatoryReport({
  chart,
  docs,
  draft,
  errs,
  pending,
  queries,
  onOpenNotes,
  onWrap,
}) {
  const e = chart.encounter || {};
  const vit = vitalsOf(sectionsText(visitSections(docs)));
  return (
    <>
      <SideCard title="Index">
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
      </SideCard>
      {(pending || errs > 0) && (
        <button type="button" className="ehr-alertbar" onClick={onWrap}>
          <i className="bi bi-exclamation-circle-fill" />{' '}
          {pending
            ? 'A physician query is pending — the chart is on hold'
            : `${errs} claim edit${errs > 1 ? 's' : ''} must be fixed before billing`}
          <span>Open Wrap-Up</span>
        </button>
      )}
      <SideCard title="Visit Counters">
        <div className="ehr-counters">
          <div>Encounter Count: {1 + (chart.previousRecords || []).length}</div>
          <div>Progress Note Count: {docs.filter((d) => !d.isQuery).length}</div>
          <div>Diagnoses Coded: {draft.dx.length}</div>
          <div>Charge Lines: {draft.lines.length}</div>
          <div>Queries: {queries.length}</div>
        </div>
      </SideCard>
      <SideCard title={'Active Insurance' + (e.dos ? ' as of ' + e.dos : '')}>
        {e.payer ? (
          <KvTable
            rows={[
              ['Payer', e.payer],
              ['Plan', e.plan],
              ['Member ID', e.member],
            ]}
          />
        ) : (
          <p className="ehr-small">Patient has no active insurance coverage on file.</p>
        )}
      </SideCard>
      <SideCard title="Review Flowsheet">
        {Object.keys(vit).length ? (
          <KvTable
            rows={VITAL_LIST.map((v) => [
              v.label,
              vit[v.key] &&
                vit[v.key] + (v.unit && !/[a-z%°]$/i.test(vit[v.key]) ? ' ' + v.unit : ''),
            ])}
          />
        ) : (
          <NoData />
        )}
      </SideCard>
    </>
  );
}

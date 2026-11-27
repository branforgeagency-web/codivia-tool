/* Episode: the care episode and every encounter in it (newest first). rows = chartReviewRows. */
import { typeIcon } from '../chart-review/chartReviewData.js';
import { ActivityHeader, Card, CardGrid, EhrTable, KvTable } from '../ui/index.js';

export function Episode({ chart, rows, onOpenNotes }) {
  const encs = rows
    .filter((r) => r.tab === 'enc')
    .sort((a, b) => (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0));
  const ep = rows.find((r) => r.tab === 'episodes');
  return (
    <div className="ehr-act">
      <ActivityHeader title="Episode" sub={ep ? ep.cells.desc : ''} />
      <CardGrid>
        <Card title="Episode Summary" icon="bi-collection">
          <KvTable
            rows={[
              ['Episode', ep && ep.cells.desc],
              ['Status', ep && ep.cells.status],
              ['Start', ep && ep.when],
              ['Department', chart.deptName],
              ['Provider', (chart.encounter || {}).provider],
              ['Encounter type', chart.encounterType === 'IP' ? 'Inpatient' : 'Outpatient'],
            ]}
          />
        </Card>
      </CardGrid>
      <Card title="Encounters in this episode" icon="bi-calendar3">
        <EhrTable
          cols={['When', 'Type', 'With', 'Description', 'Chief Complaint / Reason']}
          count={encs.length}
          empty="No encounters."
        >
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
        </EhrTable>
      </Card>
    </div>
  );
}

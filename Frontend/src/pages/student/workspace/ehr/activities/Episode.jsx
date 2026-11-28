/* Episode: the patient's episodes of care (pregnancy, therapy, oncology, a surgery and its
   follow-ups …) and the encounters linked to each. rows = chartReviewRows; episode rows carry
   row.episode { name, type, status, start, end, provider, dx, note, visitIds }. Opens on the
   episode that holds this visit. */
import { useState } from 'react';
import { typeIcon } from '../chart-review/chartReviewData.js';
import { ActivityHeader, Card, CardGrid, EhrTable, KvTable } from '../ui/index.js';

export function Episode({ rows, onOpenNotes }) {
  const eps = rows.filter((r) => r.tab === 'episodes');
  const [pick, setPick] = useState(null);
  const sel = eps.find((r) => r.id === pick) || eps.find((r) => r.current) || eps[0] || null;
  const ep = sel ? sel.episode : null;
  const encs = ep
    ? rows
        .filter((r) => r.tab === 'enc' && ep.visitIds.includes(r.id))
        .sort((a, b) => (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0))
    : [];
  return (
    <div className="ehr-act">
      <ActivityHeader title="Episode" sub={ep ? ep.name : ''} />
      {eps.length > 1 && (
        <div className="ehr-subtabs" role="tablist" aria-label="Episodes">
          {eps.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={sel === r}
              className={sel === r ? 'on' : ''}
              onClick={() => setPick(r.id)}
            >
              {r.episode.name}
              <small>{r.cells.status}</small>
            </button>
          ))}
        </div>
      )}
      {!ep ? (
        <div className="ehr-empty">No episodes on this chart.</div>
      ) : (
        <>
          <CardGrid>
            <Card title="Episode Summary" icon="bi-collection">
              <KvTable
                rows={[
                  ['Episode', ep.name],
                  ['Type', ep.type],
                  ['Status', ep.status],
                  ['Start Date', sel.when],
                  ['End Date', ep.end],
                  ['Responsible Provider', ep.provider],
                  ['Diagnosis', ep.dx],
                  ['Note', ep.note],
                  ['This visit', sel.current ? 'Part of this episode' : 'Not in this episode'],
                ]}
              />
            </Card>
          </CardGrid>
          <Card title="Encounters in this episode" icon="bi-calendar3">
            <EhrTable
              cols={['When', 'Type', 'With', 'Description', 'Chief Complaint / Reason']}
              count={encs.length}
              empty="No encounters linked to this episode."
            >
              {encs.map((r) => (
                <tr
                  key={r.id}
                  className={r.current ? 'cur' : ''}
                  onDoubleClick={() => r.doc && onOpenNotes(r.doc)}
                >
                  <td>
                    {r.when || '—'}
                    {r.current && <small className="ehr-tag">This visit</small>}
                  </td>
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
        </>
      )}
    </div>
  );
}

/* Wrap-Up: charge capture review before submitting — visit diagnoses, charges with their errors
   inline, open claim edits, physician queries, then Defer / Transfer / Submit. */
import { ActivityHeader, Card, EhrButton, EhrTable, QueryList } from '../ui/index.js';

const letter = (i) => String.fromCharCode(65 + i);

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
  const dxIdx = Object.fromEntries(draft.dx.map((d, i) => [d.id, i]));
  const lineErrs = (n) => edits.filter((x) => x.line === n);
  const open = edits.filter((x) => x.sev === 'err' || (x.sev === 'warn' && !acks.includes(x.key)));
  return (
    <div className="ehr-act">
      <ActivityHeader title="Wrap-Up" sub="Charge capture, visit diagnoses and claim edits" />
      <div className="ehr-sectabs">
        <a href="#wu-dx">Visit Diagnoses</a>
        {!set.inpatient && <a href="#wu-charges">Charge Capture</a>}
        <a href="#wu-edits">Claim Edits</a>
        <a href="#wu-queries">Queries</a>
      </div>

      <Card
        id="wu-dx"
        title="Visit Diagnoses"
        icon="bi-clipboard2-pulse"
        action={
          <EhrButton icon="bi-plus-lg" onClick={() => onGo('dx')}>
            Add
          </EhrButton>
        }
      >
        <EhrTable
          cols={['#', 'Code', 'Description', 'Type', set.inpatient && 'POA']}
          count={draft.dx.length}
          empty="No diagnoses yet."
        >
          {draft.dx.map((d, i) => (
            <tr key={d.id}>
              <td>{set.inpatient ? i + 1 : letter(i)}</td>
              <td className="mono">{d.code}</td>
              <td>{d.desc}</td>
              <td>{d.cls}</td>
              {set.inpatient && <td>{d.poa || '—'}</td>}
            </tr>
          ))}
        </EhrTable>
      </Card>

      {!set.inpatient && (
        <Card
          id="wu-charges"
          title="Charge Capture"
          icon="bi-cash-stack"
          action={
            <EhrButton icon="bi-plus-lg" onClick={() => onGo('cpt')}>
              Add charge
            </EhrButton>
          }
        >
          <div className="ehr-chargehead">
            {[
              ['Service Date', e.dos],
              ['Department', chart.deptName],
              ['Place of Service', e.pos || e.facility],
              ['Service Provider', e.provider],
            ].map(([l, v]) => (
              <span key={l}>
                <b>{l}</b> {v || '—'}
              </span>
            ))}
          </div>
          <EhrTable
            className="charges"
            cols={[
              'Description',
              'Code',
              'Modifiers',
              'Qty',
              'Dx',
              'Service Date',
              'Service Provider',
            ]}
            count={draft.lines.length}
            empty="No charges to display."
          >
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
          </EhrTable>
        </Card>
      )}

      <Card id="wu-edits" title={`Claim Edits (${open.length})`} icon="bi-exclamation-triangle">
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
      </Card>

      <Card
        id="wu-queries"
        title={`Physician Queries (${queries.length})`}
        icon="bi-chat-left-dots"
        action={
          <EhrButton icon="bi-plus-lg" onClick={onQuery}>
            New query
          </EhrButton>
        }
      >
        <QueryList queries={queries} />
      </Card>

      <div className="ehr-wrapacts">
        <EhrButton onClick={onDefer}>Defer</EhrButton>
        <EhrButton onClick={onTransfer}>Transfer</EhrButton>
        <EhrButton
          primary
          icon="bi-check-lg"
          disabled={!ready}
          onClick={onSubmit}
          title={ready ? '' : 'Wait for the answer to your physician query first'}
        >
          {submitLabel}
        </EhrButton>
      </div>
    </div>
  );
}

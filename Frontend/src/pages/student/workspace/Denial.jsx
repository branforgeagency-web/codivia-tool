/* CODIVIA workspace — denial follow-up: EOB / claim / note / account activity, then decide → correct → notify. */
import { useState } from 'react';
import { AcceptModal } from './Modals.jsx';
import { DxSection, LinesSection } from './Sections.jsx';
import { LETTERS, money, norm } from './model.js';

// Decisions and remit-code descriptions come from the reference lists (`lists`, GET /reference/work-queue).

export function DenialLeft({ chart, docs, lists }) {
  const [tab, setTab] = useState('eob');
  const D = chart.denial || {};
  const I = D.invoice || {};
  const o = chart.original || { dx: [], lines: [] };
  const e = chart.encounter || {};
  const used = new Set(chart.remits || []);
  const carc = ((lists && lists.remitCodes) || []).filter((r) => used.has(r.value));
  const tabs = [['eob', 'EOB'], ['claim', 'Claim as billed'], ...docs.map((d) => ['doc:' + d.key, d.title]), ['history', 'Account activity']];
  const doc = tab.startsWith('doc:') ? docs.find((d) => 'doc:' + d.key === tab) : null;
  return (
    <div className="card panel">
      <div className="wsx-denied">
        <span style={{ fontSize: 22 }}>⛔</span>
        <div>
          <b>
            Claim denied{I.daysToAppeal != null ? ` · ${I.daysToAppeal} days left to appeal` : ''}
          </b>
          <span className="muted" style={{ fontSize: 13 }}>
            Billed {money(I.billed)} · Allowed {money(I.allowed)} · {D.queue || 'Coding denials'}
          </span>
        </div>
      </div>
      <div className="tabs" style={{ marginTop: 12 }}>
        {tabs.map(([k, l]) => (
          <button key={k} type="button" className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <div className="pb">
        {tab === 'eob' && (
          <div className="wsx-eob">
            <div className="eh">
              {[['Payer', e.payer], ['Claim number', I.num, 1], ['ICN', I.icn, 1], ['Patient', chart.patient && chart.patient.name], ['Member ID', e.member, 1], ['Received', I.received]].map(([l, v, m]) => (
                <div key={l}>
                  <span>{l}</span>
                  <b className={m ? 'code' : ''}>{v || '—'}</b>
                </div>
              ))}
            </div>
            <table className="wsx-simple">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>DOS</th>
                  <th>Mod</th>
                  <th>Units</th>
                  <th style={{ textAlign: 'right' }}>Billed</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {o.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="code">{l.code}</td>
                    <td>{e.dos}</td>
                    <td className="code">{(l.mods || []).filter(Boolean).join(' ') || '—'}</td>
                    <td>{l.units || 1}</td>
                    <td className="amt">{money(l.billed)}</td>
                    <td className="amt">{money(l.paid)}</td>
                    <td>{l.remit ? <span className={'pill remit ' + (l.remit === 'CO-97' ? 'gray' : 'err')}>{l.remit}</span> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4 style={{ margin: '18px 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--w-muted)' }}>Reason code descriptions</h4>
            {carc.map((r) => (
              <div key={r.value} style={{ padding: '8px 0', borderBottom: '1px solid var(--w-line2)' }}>
                <span className="remit">{r.label}</span> — {r.desc}
              </div>
            ))}
            <p className="muted" style={{ fontSize: 13 }}>
              CO = contractual obligation (provider's responsibility, cannot bill the patient). PI = payer-initiated reduction.
            </p>
          </div>
        )}
        {tab === 'claim' && (
          <div className="wsx-eob">
            <div className="muted" style={{ marginBottom: 10 }}>
              Diagnoses as billed: {o.dx.map((x, i) => `${LETTERS[i]} ${x.code}`).join(' · ')}
            </div>
            <table className="wsx-simple">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Mods</th>
                  <th>Units</th>
                  <th>Dx pointers</th>
                </tr>
              </thead>
              <tbody>
                {o.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="code">{l.code}</td>
                    <td className="code">{(l.mods || []).filter(Boolean).join(' ') || '—'}</td>
                    <td>{l.units || 1}</td>
                    <td className="code">{(l.ptrs || []).map((p) => LETTERS[o.dx.findIndex((x) => norm(x.code) === norm(p))]).join(',')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {doc && (
          <article className="wsx-doc">
            {doc.sections.map((s, i) => (
              <section key={i}>
                {s.head !== 'RECORD' && <h5>{s.head}</h5>}
                <p>{s.body}</p>
              </section>
            ))}
          </article>
        )}
        {tab === 'history' && (
          <table className="wsx-simple">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Detail</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(D.history || []).map((h, i) => (
                <tr key={i}>
                  <td>{h[0]}</td>
                  <td>
                    <b>{h[1]}</b>
                  </td>
                  <td>{h[2]}</td>
                  <td className="amt">{h[3]}</td>
                </tr>
              ))}
              {chart.work &&
                (chart.work.activity || []).map((a, i) => (
                  <tr key={'a' + i}>
                    <td>{new Date(a.at).toLocaleDateString()}</td>
                    <td>
                      <b>Your work</b>
                    </td>
                    <td>{a.text}</td>
                    <td />
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function DenialRight({ chart, draft, change, set, describe, edits, onFinish, onAccept, evidence, docs, lists }) {
  const [accepting, setAccepting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const I = (chart.denial && chart.denial.invoice) || {};
  const remits = Object.fromEntries(((chart.original && chart.original.lines) || []).filter((l) => l.remit).map((l) => [norm(l.code), l.remit]));
  const step = draft.step || 1;
  const finish = async () => {
    if (busy) return;
    if ((draft.comment || '').trim().length < 10) return setError('Enter a comment (at least 10 characters).');
    setBusy(true);
    setError('');
    try {
      await onFinish();
    } catch (e) {
      setError(e.message || 'Could not submit.');
    }
    setBusy(false);
  };
  const Step = ({ n, t }) => (
    <span className={step === n ? 'on' : step > n ? 'done' : ''}>
      <i>{step > n ? '✓' : n}</i>
      {t}
    </span>
  );
  return (
    <div className="card panel">
      <div className="ph">
        <h2>Work this denial</h2>
      </div>
      <div className="wsx-steps">
        <Step n={1} t="Decide" />
        <span>—</span>
        <Step n={2} t={draft.decision && draft.decision !== 'correct' ? 'Comment' : 'Correct'} />
        <span>—</span>
        <Step n={3} t="Pending & notify" />
      </div>
      {step === 1 && (
        <>
          <div className="pb">
            <div className="sec">
              <div className="sh">
                <h3>What will you do with this denial?</h3>
              </div>
              <div className="wsx-decide">
                {((lists && lists.denialDecisions) || []).map((o) => (
                  <button key={o.value} type="button" className={'wsx-opt' + (draft.decision === o.value ? ' on' : '')} onClick={() => change((d) => (d.decision = o.value))}>
                    <b>{o.label}</b>
                    <span>{o.desc}</span>
                  </button>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 13 }}>
                Tip: read the reason codes on the EOB (left) before deciding.{I.daysToAppeal != null ? ` ${I.daysToAppeal} days are left to appeal.` : ''}
              </p>
            </div>
          </div>
          <div className="abar">
            <div className="sp" />
            <button type="button" className="btn primary" disabled={!draft.decision} onClick={() => change((d) => (d.step = 2))}>
              {draft.decision === 'correct' ? 'Open charge correction ▸' : 'Continue ▸'}
            </button>
          </div>
        </>
      )}
      {step === 2 && draft.decision !== 'correct' && (
        <>
          <div className="pb">
            <div className="sec">
              <div className="sh">
                <h3>{draft.decision === 'appeal' ? 'Start appeal' : 'Write off balance'}</h3>
              </div>
              <div className="field">
                <label htmlFor="dn-c">Comment (required)</label>
                <textarea id="dn-c" className="inp" maxLength={1000} value={draft.comment} onChange={(e) => change((d) => (d.comment = e.target.value))} placeholder="Why are you taking this action?" />
              </div>
              {error && <div className="wsx-err">{error}</div>}
            </div>
          </div>
          <div className="abar">
            <button type="button" className="btn" onClick={() => change((d) => (d.step = 1))}>
              ◂ Back
            </button>
            <div className="sp" />
            <button type="button" className="btn primary" disabled={busy} onClick={finish}>
              {busy ? 'Scoring…' : 'Submit ▸'}
            </button>
          </div>
        </>
      )}
      {step === 2 && draft.decision === 'correct' && (
        <>
          <div className="pb">
            <DxSection draft={draft} change={change} set={set} lists={lists} evidence={evidence} docs={docs} onGoEvidence={() => {}} onInfo={() => {}} removeDx={(id) => change((d) => {
              d.dx = d.dx.filter((x) => x.id !== id);
              d.lines.forEach((l) => (l.ptrs = l.ptrs.filter((p) => p !== id)));
            })} />
            <LinesSection draft={draft} change={change} edits={edits} describe={describe} lists={lists} remits={remits} noAdd />
            <div className="sec">
              <div className="field">
                <label htmlFor="dn-cc">Correction comment (goes on the voided transaction — required)</label>
                <textarea id="dn-cc" className="inp" maxLength={1000} value={draft.comment} onChange={(e) => change((d) => (d.comment = e.target.value))} placeholder="e.g. removed 25 from FQHC encounter, re-sequenced diagnoses" />
              </div>
              {error && <div className="wsx-err">{error}</div>}
            </div>
          </div>
          <div className="abar">
            <button type="button" className="btn" onClick={() => change((d) => (d.step = 1))}>
              ◂ Back
            </button>
            <div className="sp" />
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                if ((draft.comment || '').trim().length < 10) return setError('Enter a correction comment (at least 10 characters).');
                setError('');
                setAccepting(true);
              }}
            >
              Accept correction ▸
            </button>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <div className="pb">
            <div className="sec">
              <div className="wsx-clean" style={{ textAlign: 'left', margin: '0 0 14px' }}>
                ✓ Correction accepted. Session <span className="code">{draft.session}</span> is now <b>pending</b>.
              </div>
              <table className="wsx-simple">
                <thead>
                  <tr>
                    <th>Line</th>
                    <th>Code</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.lines.map((l, i) => (
                    <tr key={l.id}>
                      <td>{i + 1}</td>
                      <td className="code">
                        {l.code}
                        {l.mods.filter(Boolean).length ? '-' + l.mods.filter(Boolean).join('-') : ''}
                      </td>
                      <td>
                        <span className="pill ok">Corrected</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 14, margin: '16px 0 8px' }}>Last step: note the pending session number and let the charge review team know it is waiting to be processed.</p>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
                <input type="checkbox" checked={!!draft.notified} onChange={(e) => change((d) => (d.notified = e.target.checked))} style={{ width: 18, height: 18 }} /> I noted session {draft.session} and notified the charge review team
              </label>
              {error && <div className="wsx-err">{error}</div>}
            </div>
          </div>
          <div className="abar">
            <button type="button" className="btn" onClick={() => change((d) => (d.step = 2))}>
              ◂ Back
            </button>
            <div className="sp" />
            <button type="button" className="btn primary" disabled={!draft.notified || busy} onClick={finish}>
              {busy ? 'Scoring…' : 'Finish ▸'}
            </button>
          </div>
        </>
      )}
      {accepting && (
        <AcceptModal
          comment={draft.comment}
          onClose={() => setAccepting(false)}
          onAccept={async () => {
            const session = await onAccept(); // server-issued session number
            change((d) => {
              d.session = session;
              d.step = 3;
            });
          }}
        />
      )}
    </div>
  );
}

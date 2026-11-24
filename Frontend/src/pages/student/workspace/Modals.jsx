/* CODIVIA workspace — modals: defer, transfer, physician query, submit, accept correction. */
import { useEffect, useState } from 'react';
import { DX_CLASS_LABEL } from './model.js';

function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="wsx-ov" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'wsx-modal' + (wide ? ' wide' : '')}>
        <div className="mh">
          <h2>{title}</h2>
          <button type="button" className="ibtn x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="mb">{children}</div>
        <div className="mf">{footer}</div>
      </div>
    </div>
  );
}

const useAction = (run, onClose) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const go = async (...args) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await run(...args);
      onClose && onClose();
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.');
    }
    setBusy(false);
  };
  return { busy, error, go };
};

export function DeferModal({ reasons, onClose, onDefer }) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const a = useAction(() => onDefer(reason, comment.trim()));
  return (
    <Modal
      title="Defer this chart"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!reason || a.busy} onClick={() => a.go()}>
            {a.busy ? 'Deferring…' : 'Defer'}
          </button>
        </>
      }
    >
      <div className="field">
        <span className="lbl">Reason</span>
        <div className="wsx-reasons" role="radiogroup">
          {reasons.map((r) => (
            <label key={r.value}>
              <input type="radio" name="defer" checked={reason === r.value} onChange={() => setReason(r.value)} /> {r.label}
              <span className="num">{r.code}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="defer-c">Comment</label>
        <textarea id="defer-c" className="inp" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What are you waiting for?" />
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Deferring is not scored. The chart moves to your Deferred tab with your work saved, and you can resume it any time.
      </p>
      {a.error && <div className="wsx-err">{a.error}</div>}
    </Modal>
  );
}

export function TransferModal({ queues, reasons, onClose, onTransfer }) {
  const [queue, setQueue] = useState((queues[0] || {}).value || '');
  const [reason, setReason] = useState((reasons[0] || {}).value || '');
  const [comment, setComment] = useState('');
  const a = useAction(() => onTransfer(queue, reason, comment.trim()));
  return (
    <Modal
      title="Transfer to another work queue"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Don't transfer
          </button>
          <button type="button" className="btn primary" disabled={comment.trim().length < 3 || a.busy} onClick={() => a.go()}>
            {a.busy ? 'Transferring…' : 'Transfer'}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="tr-q">Work queue</label>
        <select id="tr-q" className="inp" value={queue} onChange={(e) => setQueue(e.target.value)}>
          {queues.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="tr-r">Reason</label>
        <select id="tr-r" className="inp" value={reason} onChange={(e) => setReason(e.target.value)}>
          {reasons.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="tr-c">Comment (required)</label>
        <textarea id="tr-c" className="inp" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Lab order only — not a claim encounter" />
        <span className="muted" style={{ fontSize: 12 }}>
          Max 500 characters. Transferring is not scored; the chart leaves your To do list and you can reopen it from Completed.
        </span>
      </div>
      {a.error && <div className="wsx-err">{a.error}</div>}
    </Modal>
  );
}

export function QueryModal({ chart, standardOptions = [], onClose, onSend }) {
  const e = chart.encounter || {};
  const providers = [...new Set([e.provider, ...(chart.documents || []).map((d) => (String(d.sub || '').split('·')[1] || '').trim())].filter((p) => p && /(MD|DO|NP|CRNP|PA)/.test(p)))];
  const [to, setTo] = useState(providers[0] || '');
  const [indicators, setIndicators] = useState('');
  const [question, setQuestion] = useState('');
  const [opts, setOpts] = useState(['', '', ...standardOptions.map((o) => o.label)]);
  const a = useAction(() => onSend({ to, indicators: indicators.trim(), question: question.trim(), options: opts.map((o) => o.trim()).filter(Boolean) }));
  return (
    <Modal
      title="Physician query (CDI)"
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={question.trim().length < 10 || !to.trim() || a.busy} onClick={() => a.go()}>
            {a.busy ? 'Sending…' : 'Send query & hold chart'}
          </button>
        </>
      }
    >
      <div className="wsx-payer" style={{ margin: 0 }}>
        <b>Queries must be non-leading</b>Give the clinical indicators and reasonable options, including “other” and “unable to determine”. Never mention payment or the DRG.
      </div>
      <div className="field">
        <label htmlFor="q-to">To</label>
        <input id="q-to" className="inp" list="q-to-list" value={to} placeholder="Physician name" maxLength={120} onChange={(ev) => setTo(ev.target.value)} />
        <datalist id="q-to-list">
          {providers.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor="q-ind">Clinical indicators</label>
        <textarea id="q-ind" className="inp" maxLength={1000} value={indicators} onChange={(ev) => setIndicators(ev.target.value)} placeholder="Labs, vitals, treatment and documentation that prompt the question" />
      </div>
      <div className="field">
        <label htmlFor="q-q">Question</label>
        <textarea id="q-q" className="inp" style={{ minHeight: 60 }} maxLength={1000} value={question} onChange={(ev) => setQuestion(ev.target.value)} placeholder="Based on the clinical indicators, please clarify…" />
      </div>
      <div className="field">
        <span className="lbl">Options offered to the physician</span>
        {opts.map((o, i) => (
          <input key={i} className="inp" maxLength={200} value={o} placeholder={'Option ' + (i + 1)} onChange={(ev) => setOpts((cur) => cur.map((x, k) => (k === i ? ev.target.value : x)))} aria-label={'Option ' + (i + 1)} />
        ))}
      </div>
      {a.error && <div className="wsx-err">{a.error}</div>}
    </Modal>
  );
}

export function SubmitModal({ draft, set, workType, onClose, onSubmit }) {
  const a = useAction(onSubmit);
  const fmtLine = (l) => l.code + (l.mods.filter(Boolean).length ? '-' + l.mods.filter(Boolean).join('-') : '') + ' ×' + l.units;
  return (
    <Modal
      title={set.inpatient ? 'Submit chart for audit?' : workType === 'review' ? 'Resubmit charges?' : 'Submit for scoring?'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Go back
          </button>
          <button type="button" className="btn primary" disabled={a.busy} onClick={() => a.go()}>
            {a.busy ? 'Scoring…' : 'Submit'}
          </button>
        </>
      }
    >
      <div>
        <b>Diagnoses ({set.encounterType}):</b>{' '}
        {draft.dx.map((x, i) => `${i + 1}. ${x.code} ${DX_CLASS_LABEL[x.cls] || '?'}` + (set.inpatient ? ` · POA ${x.poa || '?'}` : '')).join(' · ') || '—'}
      </div>
      {set.hasLines && (
        <div>
          <b>Charges:</b> {draft.lines.map(fmtLine).join(' · ') || '—'}
        </div>
      )}
      {set.inpatient && (
        <>
          <div>
            <b>Procedures:</b> {draft.pcs.map((p) => p.code).join(' · ') || '—'}
          </div>
          <div>
            <b>Disposition:</b> {draft.abs.disp || '—'} · <b>MS-DRG:</b> {draft.drg || '—'}
          </div>
        </>
      )}
      <div className="muted">After this the work is scored against the audited coding. You can review it and submit again later.</div>
      {a.error && <div className="wsx-err">{a.error}</div>}
    </Modal>
  );
}

export function AcceptModal({ comment, onClose, onAccept }) {
  const a = useAction(onAccept, onClose);
  return (
    <Modal
      title="Professional charge correction"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            ◂ Go back
          </button>
          <button type="button" className="btn primary" disabled={a.busy} onClick={() => a.go()}>
            {a.busy ? 'Accepting…' : 'Accept'}
          </button>
        </>
      }
    >
      <div>Do you want to accept this session?</div>
      <div className="field">
        <span className="lbl">Comment on the voided transaction</span>
        <div className="inp" style={{ height: 'auto', padding: '10px 12px', background: '#F1EFEB' }}>
          {comment}
        </div>
      </div>
      {a.error && <div className="wsx-err">{a.error}</div>}
    </Modal>
  );
}

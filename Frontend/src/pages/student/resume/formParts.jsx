import { useId, useState } from 'react';

// ---- Resume Builder form controls. Styles: .rb-* in styles/refinements.css ----

// Labelled text input / textarea. `max` shows a character counter.
export function Field({ label, value, onChange, placeholder, area, rows = 3, hint, max, type = 'text' }) {
  const id = useId();
  const len = (value || '').length;
  return (
    <div className="rb-field">
      <div className="rb-field-top">
        <label htmlFor={id}>{label}</label>
        {max ? <span className={'rb-count' + (len > max ? ' over' : '')}>{len + ' / ' + max}</span> : null}
      </div>
      {area ? (
        <textarea id={id} value={value || ''} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type={type} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint ? <small className="rb-hint">{hint}</small> : null}
    </div>
  );
}

// Collapsible editor section.
export function Section({ icon, title, meta, open, onToggle, children }) {
  return (
    <section className={'rb-sec' + (open ? ' open' : '')}>
      <button type="button" className="rb-sec-head" onClick={onToggle} aria-expanded={open}>
        <span className="rb-sec-ico">
          <i className={'bi ' + icon} aria-hidden="true" />
        </span>
        <span className="rb-sec-title">{title}</span>
        {meta ? <span className="rb-sec-meta">{meta}</span> : null}
        <i className="bi bi-chevron-down rb-sec-chev" aria-hidden="true" />
      </button>
      {open ? <div className="rb-sec-body">{children}</div> : null}
    </section>
  );
}

// One entry of a repeating list (experience, education ...), with move / remove controls.
export function ItemCard({ label, index, count, onMove, onRemove, children }) {
  return (
    <div className="rb-item">
      <div className="rb-item-head">
        <span className="rb-item-no">{index + 1}</span>
        <span className="rb-item-label">{label}</span>
        <div className="rb-item-acts">
          {count > 1 ? (
            <>
              <button type="button" title="Move up" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
                <i className="bi bi-arrow-up" />
              </button>
              <button type="button" title="Move down" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
                <i className="bi bi-arrow-down" />
              </button>
            </>
          ) : null}
          <button type="button" className="rm" title="Remove" aria-label="Remove" onClick={onRemove}>
            <i className="bi bi-trash3" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

export function AddButton({ label, onClick }) {
  return (
    <button type="button" className="rb-add" onClick={onClick}>
      <i className="bi bi-plus-lg" aria-hidden="true" /> {label}
    </button>
  );
}

// Editable bullet points, one input each (the resume skips empty ones).
export function BulletList({ items, onChange, placeholder }) {
  const list = items || [];
  const setAt = (i, v) => onChange(list.map((b, k) => (k === i ? v : b)));
  return (
    <div className="rb-bullets">
      {list.map((b, i) => (
        <div className="rb-bullet" key={i}>
          <span className="dot" aria-hidden="true" />
          <textarea rows={2} value={b} placeholder={placeholder} onChange={(e) => setAt(i, e.target.value)} />
          <button type="button" title="Remove bullet" aria-label="Remove bullet" onClick={() => onChange(list.filter((_, k) => k !== i))}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
      ))}
      <button type="button" className="rb-link" onClick={() => onChange(list.concat(['']))}>
        <i className="bi bi-plus" aria-hidden="true" /> Add bullet
      </button>
    </div>
  );
}

// Chip list: type and press Enter (or comma) to add; pasted comma-separated text is split.
export function TagInput({ label, items, onChange, placeholder }) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const list = items || [];
  const add = (text) => {
    const next = text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !list.includes(s));
    if (next.length) onChange(list.concat(next));
    setDraft('');
  };
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && list.length) {
      onChange(list.slice(0, -1));
    }
  };
  return (
    <div className="rb-field">
      <div className="rb-field-top">
        <label htmlFor={id}>{label}</label>
        <span className="rb-count">{list.length}</span>
      </div>
      <div className="rb-tags">
        {list.map((t, i) => (
          <span className="rb-tag" key={t + i}>
            {t}
            <button type="button" aria-label={'Remove ' + t} onClick={() => onChange(list.filter((_, k) => k !== i))}>
              <i className="bi bi-x" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={list.length ? 'Add more…' : placeholder}
          onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
        />
      </div>
    </div>
  );
}

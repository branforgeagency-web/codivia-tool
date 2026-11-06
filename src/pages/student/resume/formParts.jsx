// ---- form field helpers ----
export function _fld(label, val, onChange, opts) {
  opts = opts || {};
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tone-475569)', marginBottom: 3 }}>
        {label}
      </div>
      {opts.area ? (
        <textarea
          value={val || ''}
          onChange={function (ev) {
            onChange(ev.target.value);
          }}
          rows={opts.rows || 3}
          style={{
            width: '100%',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 12.5,
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      ) : (
        <input
          value={val || ''}
          placeholder={opts.ph || ''}
          onChange={function (ev) {
            onChange(ev.target.value);
          }}
          style={{
            width: '100%',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 12.5,
            boxSizing: 'border-box',
          }}
        />
      )}
    </label>
  );
}

export function _sectionHead(title) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 800,
        color: 'var(--navy)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        margin: '16px 0 8px',
        paddingBottom: 5,
        borderBottom: '2px solid var(--line)',
      }}
    >
      {title}
    </div>
  );
}

export function _rowCard(children, onRemove) {
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
        position: 'relative',
        background: 'var(--tone-fafbfc)',
      }}
    >
      <button
        onClick={onRemove}
        title="Remove"
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          border: 'none',
          background: 'var(--tone-fee)',
          color: 'var(--tone-c0392b)',
          borderRadius: 5,
          width: 22,
          height: 22,
          cursor: 'pointer',
          fontWeight: 800,
          fontSize: 13,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      {children}
    </div>
  );
}

export function _addBtn(label, onClick) {
  return (
    <button
      onClick={onClick}
      style={{
        border: '1px dashed var(--teal)',
        background: 'var(--tone-e7f6f3)',
        color: 'var(--tone-0b3b36)',
        borderRadius: 8,
        padding: '7px 12px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        width: '100%',
      }}
    >
      {'+ ' + label}
    </button>
  );
}

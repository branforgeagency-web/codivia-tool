import React from 'react';
import { FindACode } from '../../../components/code-search/FindACode.jsx';

// ---- Floating lookup: stays open while the coder works the chart ----
// ---- Floating CODIVIA Code Search -----------------------------------------
// Renders the FULL Code Search page (Alphabetic Index, Tabular List, Neoplasm
// Table, Drugs & Chemicals, External Cause Index, CPT, HCPCS, PCS) in a window
// that floats over the chart, so the coder never loses their place.
export function FloatingLookup({ codeDB, dbStatus, onInsert, isHH, notice, onClose }) {
  const startW = Math.min(880, Math.max(560, (window.innerWidth || 1200) - 420));
  const [pos, setPos] = React.useState({
    x: Math.max(12, ((window.innerWidth || 1200) - startW) / 2),
    y: 72,
  });
  const [size, setSize] = React.useState({
    w: startW,
    h: Math.min(660, (window.innerHeight || 800) - 140),
  });
  const [max, setMax] = React.useState(false);
  const drag = React.useRef(null);
  const rez = React.useRef(null);

  React.useEffect(() => {
    const move = (ev) => {
      if (drag.current) {
        setPos({
          x: Math.max(4, ev.clientX - drag.current.dx),
          y: Math.max(4, ev.clientY - drag.current.dy),
        });
      } else if (rez.current) {
        setSize({
          w: Math.max(420, rez.current.w + (ev.clientX - rez.current.x)),
          h: Math.max(320, rez.current.h + (ev.clientY - rez.current.y)),
        });
      }
    };
    const up = () => {
      drag.current = null;
      rez.current = null;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  const frame = max
    ? { left: 8, top: 60, width: 'calc(100vw - 16px)', height: 'calc(100vh - 76px)' }
    : { left: pos.x, top: pos.y, width: size.w, height: size.h };

  return (
    <div
      style={Object.assign(
        {
          position: 'fixed',
          zIndex: 9999,
          background: 'var(--color-white)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          boxShadow: '0 18px 56px rgba(15,47,86,.34)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
        frame,
      )}
    >
      {/* title bar — drag handle */}
      <div
        onMouseDown={(ev) => {
          if (!max) drag.current = { dx: ev.clientX - pos.x, dy: ev.clientY - pos.y };
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 13px',
          cursor: max ? 'default' : 'move',
          background: 'var(--tone-0f2f56)',
          color: 'var(--color-white)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, flex: 1 }}>
          ⌕ CODIVIA CODE SEARCH
        </span>
        {onInsert && (
          <span style={{ fontSize: 10, color: 'var(--tone-bcd4ef)' }}>
            click a code in the Tabular to add it to the chart
          </span>
        )}
        <button
          onClick={() => setMax((v) => !v)}
          title={max ? 'Restore' : 'Maximise'}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,.35)',
            color: 'var(--color-white)',
            fontSize: 11,
            cursor: 'pointer',
            borderRadius: 5,
            padding: '2px 8px',
          }}
        >
          {max ? '\u2921' : '\u2922'}
        </button>
        <button
          onClick={onClose}
          title="Close"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-white)',
            fontSize: 17,
            cursor: 'pointer',
            lineHeight: 1,
            padding: '0 2px',
          }}
        >
          ×
        </button>
      </div>
      {notice && (
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--tone-9a6b12)',
            background: 'var(--tone-fff8ec)',
            borderBottom: '1px solid var(--tone-f0d9a8)',
            padding: '8px 13px',
            lineHeight: 1.5,
            flexShrink: 0,
          }}
        >
          {notice}
        </div>
      )}
      {/* the REAL Code Search page, scrolled inside the window */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 4px' }}>
        <FindACode
          codeDB={codeDB}
          dbStatus={dbStatus}
          onInsert={onInsert}
          isHH={isHH}
          embedded={true}
        />
      </div>
      {/* resize grip */}
      {!max && (
        <div
          onMouseDown={(ev) => {
            rez.current = { x: ev.clientX, y: ev.clientY, w: size.w, h: size.h };
          }}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 18,
            height: 18,
            cursor: 'nwse-resize',
            background: 'linear-gradient(135deg, transparent 50%, var(--line) 50%)',
          }}
        />
      )}
    </div>
  );
}

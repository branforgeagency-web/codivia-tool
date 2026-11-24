/* CODIVIA workspace — "Code Search" button that opens the code search in a popup right below it,
   so the student never leaves the chart. Search only: codes are entered in the entry boxes. */
import { useEffect, useRef, useState } from 'react';
import { FindACode } from '../../../components/code-search/FindACode.jsx';

export function CodeSearchButton({ codeDB, dbStatus }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // keep the search (and its results) while on this chart
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onDown = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <div className="wsx-cs" ref={wrap}>
      <button
        type="button"
        className={'btn sm' + (open ? ' primary' : '')}
        aria-expanded={open}
        aria-controls="wsx-cs-pop"
        title="Search codes without leaving the chart"
        onClick={() => {
          setOpen((o) => !o);
          setMounted(true);
        }}
      >
        ⌕ Code Search {open ? '▴' : '▾'}
      </button>
      {mounted && (
        <div id="wsx-cs-pop" className="wsx-cs-pop" role="dialog" aria-label="CODIVIA Code Search" hidden={!open}>
          <div className="wsx-cs-head">
            <b>CODIVIA Code Search</b>
            <button type="button" className="btn sm" onClick={() => setOpen(false)} aria-label="Close code search">
              ✕ Close
            </button>
          </div>
          <div className="wsx-cs-body">
            <FindACode codeDB={codeDB} dbStatus={dbStatus} embedded />
          </div>
        </div>
      )}
    </div>
  );
}

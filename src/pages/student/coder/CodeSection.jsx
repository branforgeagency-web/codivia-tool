import { MODIFIERS, POA_OPTIONS } from '../../../config/constants.js';
import { CodeSearch } from './CodeSearch.jsx';

export function CodeSection({ title, sub, rows, setRows, codeDB, filterSys, mods, poa, onLookup }) {
  const upd = (i, code, desc) => {
    const n = [...rows];
    n[i] = { ...n[i], code, desc };
    setRows(n);
  };
  const setMod = (i, mod) => {
    const n = [...rows];
    n[i] = { ...n[i], mod };
    setRows(n);
  };
  const setPoa = (i, p) => {
    const n = [...rows];
    n[i] = { ...n[i], poa: p };
    setRows(n);
  };
  const add = () => setRows([...rows, { code: '', desc: '' }]);
  const rm = (i) => setRows(rows.filter((_, j) => j !== i));

  return (
    <div className="codesec">
      <div className="lbl">
        {title}
        <span className="sub">{sub}</span>
        {onLookup && (
          <button
            onClick={onLookup}
            title="Open the floating code lookup"
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 5,
              cursor: 'pointer',
              border: '1px solid var(--line)',
              background: 'var(--color-white)',
              color: 'var(--teal-d)',
              whiteSpace: 'nowrap',
              textTransform: 'none',
              letterSpacing: 0,
            }}
          >
            ⌕ lookup
          </button>
        )}
      </div>
      {rows.map((row, i) =>
        row.code ? (
          <div className="selcode" key={i}>
            <span className="c">{row.code + (row.mod ? '-' + row.mod : '')}</span>
            <span className="d">{row.desc}</span>
            {poa ? (
              <select
                className="poasel"
                value={row.poa || ''}
                onChange={(ev) => setPoa(i, ev.target.value)}
              >
                <option value="">POA?</option>
                {POA_OPTIONS.map((p, k) => (
                  <option key={k} value={p[0]} title={p[1]}>
                    {p[1]}
                  </option>
                ))}
              </select>
            ) : null}
            {mods ? (
              <select
                className="modsel"
                value={row.mod || ''}
                onChange={(ev) => setMod(i, ev.target.value)}
              >
                <option value="">+ Modifier</option>
                {MODIFIERS.map((m, k) => (
                  <option key={k} value={m[0]} title={m[1]}>
                    {m[0] + ' — ' + m[1]}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              className="rm"
              onClick={() => {
                rows.length > 1 ? rm(i) : upd(i, '', '');
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="codeline" key={i}>
            <span className="num">{i + 1 + '.'}</span>
            <CodeSearch
              codeDB={codeDB}
              filterSys={filterSys}
              onPick={(code, desc) => upd(i, code, desc)}
            />
          </div>
        ),
      )}
      <button className="addbtn" onClick={add}>
        + Add code
      </button>
    </div>
  );
}

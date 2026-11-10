import React from 'react';

// ---- Coding Guidelines: reference for ICD-10-CM, CPT, HCPCS and ICD-10-PCS ----
// Content: global CODING_GUIDE (public/data/coding-guide.js, loaded by index.html). Styles: .cg-* in styles/refinements.css.
// Each code set's colour comes from the data and is passed to CSS as --gc.

const ORDER = ['icd', 'cpt', 'pcs', 'hcpcs'];

const Icon = ({ d, size = 18 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={true}
  >
    <path d={d} />
  </svg>
);

const ICON = {
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5A2.5 2.5 0 0 1 4 18.5M9 7h7M9 11h5',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  x: 'M18 6 6 18M6 6l12 12',
  chevron: 'm9 6 6 6-6 6',
  check: 'M20 6 9 17l-5-5',
  expand: 'm7 15 5 5 5-5M7 9l5-5 5 5',
  collapse: 'm7 20 5-5 5 5M7 4l5 5 5-5',
  shield: 'M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6zM9 12l2 2 4-4',
  empty: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3M8 11h6',
  layers: 'm12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleCount = (c) => (c.s || []).reduce((n, sb) => n + (sb.p || []).length, 0);

// Wrap search matches in <mark>.
function Hl({ text, re }) {
  if (!re || !text) return text || null;
  const parts = String(text).split(re);
  return parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p));
}

export function CodingGuide() {
  // coding-guide.js declares a top-level `const CODING_GUIDE`: a global, but not a window property.
  // eslint-disable-next-line no-undef
  const GUIDE = (typeof CODING_GUIDE !== 'undefined' && CODING_GUIDE) || window.CODING_GUIDE || {};
  const [set, setSet] = React.useState('icd');
  const [open, setOpen] = React.useState({});
  const [q, setQ] = React.useState('');
  const g = GUIDE[set] || { label: '', sub: '', color: '#f26722', chapters: [] };

  const ql = q.trim().toLowerCase();
  const re = React.useMemo(() => (ql ? new RegExp('(' + escapeRegex(ql) + ')', 'ig') : null), [ql]);

  const items = React.useMemo(() => {
    const all = g.chapters;
    if (!ql) return all;
    return all.filter((c) => {
      let hay = (c.ref || '') + ' ' + c.t + ' ' + c.r + ' ' + c.i;
      (c.s || []).forEach((sb) => {
        hay += ' ' + sb.ref + ' ' + sb.t + ' ' + (sb.b || '') + ' ' + (sb.p || []).join(' ');
      });
      return hay.toLowerCase().indexOf(ql) !== -1;
    });
  }, [g, ql]);

  const totals = React.useMemo(() => {
    const sets = ORDER.filter((k) => GUIDE[k]);
    const chapters = sets.reduce((n, k) => n + GUIDE[k].chapters.length, 0);
    const rules = sets.reduce((n, k) => n + GUIDE[k].chapters.reduce((m, c) => m + ruleCount(c), 0), 0);
    return { sets: sets.length, chapters, rules };
  }, [GUIDE]);

  const opened = (k) => (ql ? true : !!open[set + ':' + k]);
  const toggle = (k) => setOpen((o) => ({ ...o, [set + ':' + k]: !o[set + ':' + k] }));
  const setAll = (value) =>
    setOpen((o) => {
      const next = { ...o };
      g.chapters.forEach((c, i) => (next[set + ':' + i] = value));
      return next;
    });

  return (
    <div className="page cg" style={{ '--gc': g.color }}>
      {/* ---------- hero ---------- */}
      <header className="cg-hero">
        <div className="cg-hero-main">
          <span className="cg-hero-ico">
            <Icon d={ICON.book} size={24} />
          </span>
          <div>
            <h1>Coding Guidelines</h1>
            <p>
              Chapter-by-chapter guidance, laid out the way the codebooks are. Open a chapter to see
              its numbered guideline subsections.
            </p>
          </div>
        </div>
        <div className="cg-stats">
          <div>
            <b>{totals.sets}</b>
            <span>code sets</span>
          </div>
          <div>
            <b>{totals.chapters}</b>
            <span>chapters</span>
          </div>
          <div>
            <b>{totals.rules}</b>
            <span>rules</span>
          </div>
        </div>
      </header>

      {/* ---------- code set picker ---------- */}
      <div className="cg-sets" role="tablist" aria-label="Code set">
        {ORDER.filter((id) => GUIDE[id]).map((id) => {
          const c = GUIDE[id];
          const on = set === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              className={'cg-set' + (on ? ' on' : '')}
              style={{ '--sc': c.color }}
              onClick={() => {
                setSet(id);
                setQ('');
              }}
            >
              <span className="cg-set-mono">{c.label.slice(0, 3)}</span>
              <span className="cg-set-tx">
                <b>{c.label}</b>
                <small>{c.sub}</small>
              </span>
              <span className="cg-set-count">{c.chapters.length}</span>
              {on && (
                <span className="cg-set-check">
                  <Icon d={ICON.check} size={12} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------- toolbar ---------- */}
      <div className="cg-toolbar">
        <label className="cg-search">
          <Icon d={ICON.search} />
          <input
            value={q}
            placeholder={'Search ' + g.label + ' — e.g. sepsis, hypertension, modifier 25, 7th character…'}
            onChange={(ev) => setQ(ev.target.value)}
            aria-label={'Search ' + g.label}
          />
          {q && (
            <button type="button" className="cg-clear" onClick={() => setQ('')} aria-label="Clear search">
              <Icon d={ICON.x} size={14} />
            </button>
          )}
          <span className="cg-count">{items.length + ' of ' + g.chapters.length}</span>
        </label>
        {!ql && (
          <div className="cg-tools">
            <button type="button" onClick={() => setAll(true)}>
              <Icon d={ICON.expand} size={15} />
              Expand all
            </button>
            <button type="button" onClick={() => setAll(false)}>
              <Icon d={ICON.collapse} size={15} />
              Collapse all
            </button>
          </div>
        )}
      </div>

      {/* ---------- chapters ---------- */}
      {items.length === 0 ? (
        <div className="cg-empty">
          <span>
            <Icon d={ICON.empty} size={26} />
          </span>
          <b>No matches</b>
          <p>{'Nothing matches that term in ' + g.label + '. Try a shorter word or another code set.'}</p>
        </div>
      ) : (
        <div className="cg-list">
          {items.map((c) => {
            // Some code sets reuse a range across chapters (e.g. PCS), so key by position in the set.
            const idx = g.chapters.indexOf(c);
            const isOpen = opened(idx);
            const numbered = typeof c.n === 'number';
            const bodyId = 'cg-' + set + '-' + idx;
            return (
              <article key={idx} className={'cg-ch' + (isOpen ? ' open' : '')}>
                <button
                  type="button"
                  className="cg-ch-head"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  aria-controls={bodyId}
                >
                  <span className="cg-ch-num">{numbered ? c.n : <Icon d={ICON.layers} size={16} />}</span>
                  <span className="cg-ch-main">
                    <span className="cg-ch-title">
                      {numbered && <small>{'Chapter ' + c.n}</small>}
                      <Hl text={c.t} re={re} />
                    </span>
                    <span className="cg-ch-meta">
                      <span className="cg-range">
                        <Hl text={c.r} re={re} />
                      </span>
                      {c.ref && c.ref !== c.r && <span className="cg-ref">{c.ref}</span>}
                      <span className="cg-pill">
                        <Icon d={ICON.list} size={12} />
                        {(c.s || []).length + ' sections · ' + ruleCount(c) + ' rules'}
                      </span>
                    </span>
                  </span>
                  <span className="cg-chev">
                    <Icon d={ICON.chevron} />
                  </span>
                </button>

                {isOpen && (
                  <div className="cg-ch-body" id={bodyId}>
                    <p className="cg-intro">
                      <Hl text={c.i} re={re} />
                    </p>
                    <div className="cg-secs">
                      {(c.s || []).map((sb, si) => (
                        <section key={si} className="cg-sec">
                          <div className="cg-sec-head">
                            <span className="cg-sec-ref">
                              {(c.ref && numbered ? c.ref + '.' : '') + sb.ref}
                            </span>
                            <h4>
                              <Hl text={sb.t} re={re} />
                            </h4>
                          </div>
                          {sb.b && (
                            <p className="cg-sec-b">
                              <Hl text={sb.b} re={re} />
                            </p>
                          )}
                          {(sb.p || []).length > 0 && (
                            <ul className="cg-rules">
                              {sb.p.map((pt, pi) => (
                                <li key={pi}>
                                  <span className="cg-tick">
                                    <Icon d={ICON.check} size={11} />
                                  </span>
                                  <span>
                                    <Hl text={pt} re={re} />
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </section>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <footer className="cg-note">
        <Icon d={ICON.shield} size={16} />
        <span>
          CODIVIA teaching reference. The chapter and section structure follows the official code sets
          so students learn to navigate the real books; all guidance is summarised in CODIVIA’s own
          words and is not a reproduction of the ICD-10-CM Official Guidelines, the AMA CPT codebook,
          or any other publication. For production coding, always verify against the current official
          guidelines and your payer policies.
        </span>
      </footer>
    </div>
  );
}

// route: /guidelines
export default function CodingGuidelinesPage() {
  return <CodingGuide />;
}

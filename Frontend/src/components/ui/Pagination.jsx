/* CODIVIA platform — reusable pager: "Showing 1–6 of 22", « ‹ page numbers › », page size.
   Keyboard: with focus anywhere in the pager, ← / → change page, Home / End jump to first / last.
   Works with usePagination() (client-side) or with API totals (server-side): it only needs
   page, pageSize, total and the change handlers. Styles: .pager-* in styles/refinements.css */

// Page numbers with ellipses, e.g. [1, '…', 4, 5, 6, '…', 12].
function pageItems(page, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const items = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(count - 1, page + 1);
  if (from > 2) items.push('…');
  for (let i = from; i <= to; i++) items.push(i);
  if (to < count - 1) items.push('…');
  items.push(count);
  return items;
}

const ARROWS = {
  first: 'm11 17-5-5 5-5M18 17l-5-5 5-5',
  prev: 'm15 18-6-6 6-6',
  next: 'm9 18 6-6-6-6',
  last: 'm13 17 5-5-5-5M6 17l5-5-5-5',
};

const Arrow = ({ dir }) => (
  <svg
    viewBox="0 0 24 24"
    width={16}
    height={16}
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={true}
  >
    <path d={ARROWS[dir]} />
  </svg>
);

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [6, 12, 24],
  itemLabel = 'items',
  showFirstLast = true,
  className = '',
}) {
  if (!total) return null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const go = (p) => {
    const next = Math.min(Math.max(1, p), pageCount);
    if (next !== page) onPageChange(next);
  };
  const atStart = page === 1;
  const atEnd = page === pageCount;

  const onKeyDown = (ev) => {
    if (ev.target.tagName === 'SELECT') return; // arrows change the page-size dropdown there
    const keys = { ArrowLeft: page - 1, ArrowRight: page + 1, Home: 1, End: pageCount };
    if (!(ev.key in keys)) return;
    ev.preventDefault();
    go(keys[ev.key]);
  };

  const arrowBtn = (dir, target, disabled, label) => (
    <button
      type="button"
      className={'pager-btn arrow ' + dir}
      onClick={() => go(target)}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Arrow dir={dir} />
    </button>
  );

  return (
    <nav className={'pager ' + className} aria-label="Pagination" onKeyDown={onKeyDown}>
      <span className="pager-info">
        Showing{' '}
        <b>
          {start}–{end}
        </b>{' '}
        of <b>{total}</b> {itemLabel}
        {pageCount > 1 && (
          <span className="pager-of">
            {' · Page '}
            {page} of {pageCount}
          </span>
        )}
      </span>

      {pageCount > 1 && (
        <div className="pager-pages">
          {showFirstLast && arrowBtn('first', 1, atStart, 'First page')}
          {arrowBtn('prev', page - 1, atStart, 'Previous page (←)')}
          {pageItems(page, pageCount).map((p, i) =>
            p === '…' ? (
              <span key={'gap' + i} className="pager-gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={'pager-btn num' + (p === page ? ' on' : '')}
                onClick={() => go(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={'Page ' + p}
              >
                {p}
              </button>
            ),
          )}
          {arrowBtn('next', page + 1, atEnd, 'Next page (→)')}
          {showFirstLast && arrowBtn('last', pageCount, atEnd, 'Last page')}
        </div>
      )}

      {onPageSizeChange && (
        <label className="pager-size">
          Per page
          <select value={pageSize} onChange={(ev) => onPageSizeChange(Number(ev.target.value))}>
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
}

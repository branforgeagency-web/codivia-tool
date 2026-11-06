import { useEffect, useMemo, useState } from 'react';
import { Loader } from './Loader.jsx';
import {
  EmptyCell, Footer, Gap, PageButton, Pager, Scroll, SizePicker, SortButton,
  Table, TableWrap, Td, Th, Tr,
} from './DataTable.styles.js';

/**
 * Reusable table with sorting and pagination.
 *
 * columns: [{ key, header, render?(row, index), sortable?, sortValue?(row), align?, width?, className? }]
 * data:    array of rows
 * rowKey:  field name or (row) => key
 *
 * Client-side mode (default): pass all rows in `data`; the table slices and sorts them.
 *
 * Server-side mode: pass `serverSide`, `totalCount`, and the current page's rows in `data`.
 * Handle page/size/sort changes in `onPageChange(page)`, `onPageSizeChange(size)`, `onSortChange({ key, dir })`.
 * `page` / `pageSize` can also be controlled in client-side mode.
 */
export function DataTable({
  columns,
  data = [],
  rowKey = 'id',
  loading = false,
  emptyMessage = 'No records found.',
  onRowClick,
  pagination = true,
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 10,
  page: controlledPage,
  pageSize: controlledPageSize,
  onPageChange,
  onPageSizeChange,
  serverSide = false,
  totalCount,
  defaultSort = null,
  onSortChange,
  className = '',
}) {
  const [innerPage, setInnerPage] = useState(1);
  const [innerSize, setInnerSize] = useState(defaultPageSize);
  const [sort, setSort] = useState(defaultSort);

  const page = controlledPage ?? innerPage;
  const pageSize = controlledPageSize ?? innerSize;

  const sorted = useMemo(() => {
    if (serverSide || !sort) return data;
    const col = columns.find(c => c.key === sort.key);
    if (!col) return data;
    const value = col.sortValue || (row => row[col.key]);
    const dir = sort.dir === 'desc' ? -1 : 1;
    return [...data].sort((a, b) => {
      const x = value(a), y = value(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }, [data, sort, columns, serverSide]);

  const total = serverSide ? (totalCount ?? data.length) : sorted.length;
  const pageCount = pagination ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  const rows = useMemo(() => {
    if (!pagination || serverSide) return sorted;
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize, pagination, serverSide]);

  function goTo(next) {
    const clamped = Math.min(Math.max(1, next), pageCount);
    if (clamped === page) return;
    if (controlledPage == null) setInnerPage(clamped);
    onPageChange?.(clamped);
  }

  function changeSize(size) {
    if (controlledPageSize == null) setInnerSize(size);
    onPageSizeChange?.(size);
    if (controlledPage == null) setInnerPage(1);
    onPageChange?.(1);
  }

  function toggleSort(col) {
    if (!col.sortable) return;
    const next = sort?.key !== col.key ? { key: col.key, dir: 'asc' }
      : sort.dir === 'asc' ? { key: col.key, dir: 'desc' } : null;
    setSort(next);
    onSortChange?.(next);
    if (controlledPage == null) setInnerPage(1);
    if (page !== 1) onPageChange?.(1);
  }

  // When the data shrinks (filter, delete), keep the page in range.
  useEffect(() => {
    if (page > pageCount) goTo(pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount]);

  const keyOf = (row, i) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey]) ?? i;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return <TableWrap className={className}>
    <Scroll>
      <Table>
        <thead>
          <tr>
            {columns.map(col => {
              const active = sort?.key === col.key;
              return <Th key={col.key} $width={col.width} $align={col.align} $sortable={col.sortable}
                aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                {col.sortable
                  ? <SortButton type="button" onClick={() => toggleSort(col)}>
                      {col.header}
                      <i className={'bi ' + (!active ? 'bi-arrow-down-up' : sort.dir === 'asc' ? 'bi-sort-up' : 'bi-sort-down')} aria-hidden="true" />
                    </SortButton>
                  : col.header}
              </Th>;
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !loading
            ? <tr><EmptyCell colSpan={columns.length}>{emptyMessage}</EmptyCell></tr>
            : rows.map((row, i) => <Tr key={keyOf(row, i)} $clickable={!!onRowClick}
                onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {columns.map(col => <Td key={col.key} className={col.className} $align={col.align}>
                  {col.render ? col.render(row, (page - 1) * pageSize + i) : row[col.key]}
                </Td>)}
              </Tr>)}
        </tbody>
      </Table>
      {loading && <Loader overlay label="Loading..." />}
    </Scroll>

    {pagination && total > 0 && <Footer>
      <div>
        Showing <b>{from}</b>–<b>{to}</b> of <b>{total}</b>
      </div>
      <SizePicker>
        Rows
        <select value={pageSize} onChange={e => changeSize(Number(e.target.value))}>
          {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </SizePicker>
      <Pager aria-label="Pagination">
        <PageButton type="button" onClick={() => goTo(1)} disabled={page <= 1} aria-label="First page"><i className="bi bi-chevron-double-left" /></PageButton>
        <PageButton type="button" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page"><i className="bi bi-chevron-left" /></PageButton>
        {pageNumbers(page, pageCount).map((n, i) => n === '…'
          ? <Gap key={'gap' + i}>…</Gap>
          : <PageButton type="button" key={n} onClick={() => goTo(n)}
              $active={n === page} aria-current={n === page ? 'page' : undefined}>{n}</PageButton>)}
        <PageButton type="button" onClick={() => goTo(page + 1)} disabled={page >= pageCount} aria-label="Next page"><i className="bi bi-chevron-right" /></PageButton>
        <PageButton type="button" onClick={() => goTo(pageCount)} disabled={page >= pageCount} aria-label="Last page"><i className="bi bi-chevron-double-right" /></PageButton>
      </Pager>
    </Footer>}
  </TableWrap>;
}

/** Page buttons with gaps, e.g. 1 … 4 5 6 … 20 */
function pageNumbers(page, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(count - 1, page + 1);
  if (start > 2) pages.push('…');
  for (let n = start; n <= end; n++) pages.push(n);
  if (end < count - 1) pages.push('…');
  pages.push(count);
  return pages;
}

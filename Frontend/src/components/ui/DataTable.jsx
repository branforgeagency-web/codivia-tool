import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader } from './Loader.jsx';
import { Pagination } from './Pagination.jsx';
import {
  EmptyCell, Footer, Scroll, SizePicker, SortButton,
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
 *
 * resetKey:  goes back to page 1 when it changes (e.g. a search term or filter).
 * itemLabel: what the rows are, for the pager text ("1–10 of 42 students").
 *
 *   <DataTable
 *     columns={[
 *       { key: 'name', header: 'Name', sortable: true },
 *       { key: 'score', header: 'Score', align: 'right', render: (s) => s.score + '%' },
 *     ]}
 *     data={students}
 *     itemLabel="students"
 *     resetKey={search}
 *   />
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
  itemLabel = 'records',
  resetKey,
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

  // A new search or filter starts from page 1. Not on mount, so a controlled start page is kept.
  const lastResetKey = useRef(resetKey);
  useEffect(() => {
    if (lastResetKey.current === resetKey) return;
    lastResetKey.current = resetKey;
    goTo(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const keyOf = (row, i) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey]) ?? i;

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
      <SizePicker>
        Rows
        <select value={pageSize} onChange={e => changeSize(Number(e.target.value))}>
          {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </SizePicker>
      <Pagination page={Math.min(page, pageCount)} pageSize={pageSize} total={total} onPageChange={goTo} itemLabel={itemLabel} />
    </Footer>}
  </TableWrap>;
}

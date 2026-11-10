import { useEffect, useMemo, useState } from 'react';

/**
 * Client-side pagination for any list.
 *
 *   const pager = usePagination(rows, { pageSize: 6, resetKey: filter });
 *   pager.items                       → rows on the current page
 *   <Pagination {...pager.props} />   → ready-made props for the Pagination component
 *
 * - Goes back to page 1 whenever `resetKey` changes (e.g. a filter or search term).
 * - Clamps the page when the list shrinks, so you never land on an empty page.
 */
export function usePagination(list, { pageSize: initialSize = 10, resetKey } = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => setPage(1), [resetKey]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const current = Math.min(page, pageCount);
  const items = useMemo(
    () => list.slice((current - 1) * pageSize, current * pageSize),
    [list, current, pageSize],
  );

  const changeSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    items,
    page: current,
    pageSize,
    pageCount,
    total,
    setPage,
    setPageSize: changeSize,
    props: {
      page: current,
      pageSize,
      total,
      onPageChange: setPage,
      onPageSizeChange: changeSize,
    },
  };
}

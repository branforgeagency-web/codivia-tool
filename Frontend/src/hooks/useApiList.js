import { useCallback, useEffect, useMemo, useState } from 'react';
import { get } from '../services/apiHelper.js';

/**
 * A server-paged list from a GET endpoint that answers { results, page, limit, totalResults, ... }.
 *
 *   const list = useApiList(ADMIN_STUDENTS, { params: { status, search }, reloadKey: version });
 *   list.results / list.data (whole response: filters, statistics…) / list.loading / list.error
 *   <Pagination {...list.pagerProps} itemLabel="students" />
 *
 * - 10 rows per page unless `limit` is given.
 * - Goes back to page 1 when `params` change; empty / undefined params are left out of the URL.
 * - Re-fetches when `reloadKey` changes, or on list.reload().
 */
export function useApiList(endpoint, { params = {}, limit = 10, reloadKey, enabled = true } = {}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const clean = useMemo(
    () => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(params)],
  );
  const paramsKey = JSON.stringify(clean);

  // New filter / search: back to page 1.
  useEffect(() => setPage(1), [paramsKey]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    get(endpoint, { params: { ...clean, page, limit } })
      .then((r) => {
        if (cancelled) return;
        // Past the last page (rows were removed): jump back to the last one.
        if (r.totalPages && page > r.totalPages) setPage(r.totalPages);
        else setData(r);
      })
      .catch((e) => !cancelled && setError(e.message || 'Could not load data.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, page, limit, reloadKey, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return {
    data,
    results: (data && data.results) || [],
    total: (data && data.totalResults) || 0,
    loading,
    error,
    page,
    setPage,
    reload,
    pagerProps: { page, pageSize: limit, total: (data && data.totalResults) || 0, onPageChange: setPage },
  };
}

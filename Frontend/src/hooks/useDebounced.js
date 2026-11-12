import { useEffect, useState } from 'react';

// `value`, once it has stopped changing for `ms` (search boxes that query the API).
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

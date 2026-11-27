/* Drag-to-resize for a panel that follows a drag bar: the right panel (axis 'x', the panel is to
   the right of the bar) or the Chart Review preview (axis 'y', the panel is below the bar). The
   size is kept in localStorage so it stays the same on the next chart; null = the CSS default.
   Returns { size, width (= size), reset, handleProps } — spread handleProps on the drag bar. */
import { useCallback, useEffect, useRef, useState } from 'react';

const read = (key) => {
  try {
    const v = Number(window.localStorage.getItem(key));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
};

export function useDragSize({
  storageKey,
  axis = 'x',
  min = 320,
  maxRatio = 0.7,
  step = 24,
  label = 'Resize the panel',
}) {
  const [size, setSize] = useState(() => read(storageKey));
  const drag = useRef(null); // { start, startSize, max }
  const x = axis === 'x';
  const dim = x ? 'width' : 'height';
  const pos = (e) => (x ? e.clientX : e.clientY);

  useEffect(() => {
    try {
      if (size) window.localStorage.setItem(storageKey, String(Math.round(size)));
      else window.localStorage.removeItem(storageKey);
    } catch {
      /* storage blocked: the size just isn't remembered */
    }
  }, [storageKey, size]);

  const clamp = useCallback((v, max) => Math.max(min, Math.min(max, v)), [min]);
  const measure = useCallback(
    (bar) => ({
      now: bar.nextElementSibling
        ? bar.nextElementSibling.getBoundingClientRect()[dim]
        : size || min,
      max: bar.parentElement.getBoundingClientRect()[dim] * maxRatio,
    }),
    [dim, maxRatio, min, size],
  );

  const onPointerDown = useCallback(
    (e) => {
      const bar = e.currentTarget;
      const { now, max } = measure(bar);
      drag.current = { start: pos(e), startSize: now, max };
      bar.setPointerCapture(e.pointerId);
      document.body.classList.add(x ? 'ehr-resizing' : 'ehr-resizing-y');
      e.preventDefault();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measure, x],
  );
  const onPointerMove = useCallback(
    (e) => {
      const d = drag.current;
      if (!d) return;
      // The panel comes after the bar (right of it / below it): moving toward it makes it smaller.
      setSize(clamp(d.startSize + (d.start - pos(e)), d.max));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clamp, x],
  );
  const end = useCallback(() => {
    drag.current = null;
    document.body.classList.remove('ehr-resizing', 'ehr-resizing-y');
  }, []);
  const grow = x ? 'ArrowLeft' : 'ArrowUp';
  const shrink = x ? 'ArrowRight' : 'ArrowDown';
  const onKeyDown = useCallback(
    (e) => {
      if (e.key !== grow && e.key !== shrink) return;
      e.preventDefault();
      const { now, max } = measure(e.currentTarget);
      setSize(clamp(now + (e.key === grow ? step : -step), max));
    },
    [clamp, grow, measure, shrink, step],
  );

  return {
    size,
    width: size,
    reset: () => setSize(null),
    handleProps: {
      role: 'separator',
      'aria-orientation': x ? 'vertical' : 'horizontal',
      'aria-label': label + ' (drag, or use the arrow keys; double-click to reset)',
      tabIndex: 0,
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onKeyDown,
      onDoubleClick: () => setSize(null),
    },
  };
}

// The right panel's width (kept for existing callers).
export const useDragWidth = (opts) =>
  useDragSize({ label: 'Resize the right panel', ...opts, axis: 'x' });

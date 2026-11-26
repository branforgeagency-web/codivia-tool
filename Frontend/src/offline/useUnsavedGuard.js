/* CODIVIA offline — warn before closing / reloading the tab while changes haven't reached the server.
 *   useUnsavedGuard(sync.unsynced, labels.leaveWarning)
 * Browsers show their own wording; the message is used where supported. */
import { useEffect } from 'react';

export function useUnsavedGuard(active, message) {
  useEffect(() => {
    if (!active) return undefined;
    const onBeforeUnload = (ev) => {
      ev.preventDefault();
      ev.returnValue = message || '';
      return message || '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active, message]);
}

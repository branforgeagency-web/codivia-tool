/* CODIVIA offline — banner across the workspace while the browser is offline.
 *   <OfflineBanner text={labels.offlineBanner} />   (renders nothing while online)
 * Styles: .ofl-banner in offline.css */
import { useOnline } from '../hooks/useOnline.js';

export function OfflineBanner({ text }) {
  const online = useOnline();
  if (online || !text) return null;
  return (
    <div className="ofl-banner" role="alert">
      <i className="bi bi-wifi-off" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

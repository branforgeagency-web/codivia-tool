/* CODIVIA platform — loading screen shown while the session starts up */
import { brand } from '../../config/brand.js';

export function Splash() {
  return (
    <div className="splash">
      <div className="splash-logo-wrap">
        <div className="splash-halo" />
        <img className="splash-logo" src={brand.logoWhite} alt="CODIVIA" />
        <div className="splash-shimmer" />
      </div>
      <div className="splash-tag">Code · Validate · Get Hired</div>
      <div className="splash-bar">
        <i />
      </div>
      <div className="splash-status">Preparing your workspace…</div>
    </div>
  );
}

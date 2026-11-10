/* CODIVIA platform — page loader: an orange ECG pulse being traced inside a soft badge.
 *
 * <PageLoader />                              centred in the content area (lazy pages, data loads)
 * <PageLoader label="Loading charts" />       custom text (the animated dots are added for you)
 * <PageLoader variant="full" />               covers the whole screen
 * <PageLoader variant="inline" />             compact, for a card or panel
 *
 * Styles: .page-loader* in styles/refinements.css. For small inline spinners use Loader.jsx.
 */
export function PageLoader({ label = 'Loading page', variant = 'page' }) {
  return (
    <div
      className={'page-loader' + (variant !== 'page' ? ' ' + variant : '')}
      role="status"
      aria-live="polite"
    >
      <div className="page-loader-badge">
        <svg viewBox="0 0 72 40" aria-hidden={true}>
          <defs>
            <linearGradient id="page-loader-grad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#ffb27a" />
              <stop offset="1" stopColor="#f26722" />
            </linearGradient>
          </defs>
          <path className="trace-bg" d="M2 22h16l5-10 6 20 6-28 5 18h30" />
          <path className="trace" d="M2 22h16l5-10 6 20 6-28 5 18h30" pathLength={200} />
        </svg>
      </div>
      <span className="page-loader-label">{label}</span>
    </div>
  );
}

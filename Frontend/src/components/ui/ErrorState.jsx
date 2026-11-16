/* CODIVIA platform — fallback panel for anything that failed: a crashed page, a failed load,
 * an unreachable server. Styles: .cv-fallback* in styles/fallback.css.
 *
 * <ErrorState title="Couldn't load your charts" message={error} onRetry={reload} />
 * <ErrorState variant="full" … />      covers the whole screen (app start, crashed app)
 * <ErrorState variant="inline" … />    compact, inside a card or panel
 * actions: [{ label, onClick, primary }] extra buttons after "Try again"
 */
export function ErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Try again', actions = [], variant = 'page', icon = '⚠', details }) {
  return (
    <div className={'cv-fallback ' + variant} role="alert">
      <div className="cv-fallback-card">
        <div className="cv-fallback-icon" aria-hidden="true">
          {icon}
        </div>
        <h2>{title}</h2>
        {message && <p>{message}</p>}
        {(onRetry || actions.length > 0) && (
          <div className="cv-fallback-actions">
            {onRetry && (
              <button type="button" className="btn btn-teal" onClick={onRetry}>
                {retryLabel}
              </button>
            )}
            {actions.map((a) => (
              <button key={a.label} type="button" className={'btn ' + (a.primary ? 'btn-teal' : 'btn-ghost')} onClick={a.onClick}>
                {a.label}
              </button>
            ))}
          </div>
        )}
        {details && (
          <details className="cv-fallback-details">
            <summary>Technical details</summary>
            <pre>{details}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

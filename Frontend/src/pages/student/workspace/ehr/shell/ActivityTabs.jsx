/* Activity tabs across the top (Chart Review, Episode, Notes …) with ◀ ▶ history buttons.
   tabs: [{ key, label, icon, big, hint, count, tone }] — see activities/registry.js. */
export function ActivityTabs({
  tabs,
  active,
  onTab,
  right,
  onBack,
  onForward,
  canBack,
  canForward,
}) {
  return (
    <div className="ehr-acttabs" role="tablist" aria-label="Activities">
      <span className="nav">
        <button type="button" onClick={onBack} disabled={!canBack} aria-label="Back" title="Back">
          <i className="bi bi-arrow-left" />
        </button>
        <button
          type="button"
          onClick={onForward}
          disabled={!canForward}
          aria-label="Forward"
          title="Forward"
        >
          <i className="bi bi-arrow-right" />
        </button>
      </span>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          className={(active === t.key ? 'on' : '') + (t.big ? ' big' : '')}
          onClick={() => onTab(t.key)}
          title={t.hint || ''}
        >
          {t.icon && <i className={'bi ' + t.icon + ' ic-' + t.key} />}
          {t.label}
          {t.count ? <span className={'cnt' + (t.tone ? ' ' + t.tone : '')}>{t.count}</span> : null}
        </button>
      ))}
      <div className="sp" />
      {right}
    </div>
  );
}

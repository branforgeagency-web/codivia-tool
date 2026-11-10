/* CODIVIA platform — KPI tile: icon badge, label, big value, caption.
 *
 * <StatTiles>
 *   <StatTile lead icon={PATH} label="Total Worked" value={42} caption="charts submitted" />
 *   <StatTile icon={PATH} label="Accuracy" value="91%" />
 * </StatTiles>
 *
 * `icon` is an SVG path (24×24 viewBox). `lead` = the highlighted orange tile.
 * Styles: .stat-tile* in styles/refinements.css
 */
export function StatTile({ icon, label, value, caption, lead = false }) {
  return (
    <div className={'stat-tile' + (lead ? ' lead' : '')}>
      {icon && (
        <span className="stat-tile-ico">
          <svg
            viewBox="0 0 24 24"
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden={true}
          >
            <path d={icon} />
          </svg>
        </span>
      )}
      <div>
        <span className="k">{label}</span>
        <b className="v">{value}</b>
        {caption && <span className="s">{caption}</span>}
      </div>
    </div>
  );
}

export function StatTiles({ children }) {
  return <div className="stat-tiles">{children}</div>;
}

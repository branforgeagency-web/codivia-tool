/* CODIVIA platform — stat tile: label, big value, small caption */
export function StatCard({ k, v, s, teal }) {
  return (
    <div className={'stat' + (teal ? ' teal' : '')}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  );
}

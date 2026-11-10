/* CODIVIA platform — circular percentage gauge.
   value: 0-100, or null for "no data" (grey track + dash). tone: '' | 'hi' | 'mid' | 'lo' (see accTone).
   Styles: .ui-ring in styles/refinements.css */
export function ProgressRing({ value, size = 64, stroke = 7, tone = '', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={'ui-ring ' + tone} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden={true}>
        <circle className="trk" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="val"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
        />
      </svg>
      <span>{value == null ? '—' : value + '%'}</span>
      {label && <small>{label}</small>}
    </div>
  );
}

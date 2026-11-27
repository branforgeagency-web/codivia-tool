/* CODIVIA EHR shell — small building blocks every activity and sidebar report uses. */
import { hasValue } from '../lib/chartText.js';

// Activity title row: "Chart Review", an optional subtitle, extra content and a close ✕.
export function ActivityHeader({ title, sub, onClose, children }) {
  return (
    <div className="ehr-acthead">
      <h2>{title}</h2>
      {sub && <span className="ehr-sub">{sub}</span>}
      {children}
      {onClose && (
        <>
          <div className="sp" />
          <button
            type="button"
            className="ehr-x"
            onClick={onClose}
            aria-label={'Close ' + title}
            title="Close"
          >
            <i className="bi bi-x-lg" />
          </button>
        </>
      )}
    </div>
  );
}

// White section with a left colour bar: icon + title, optional action button on the right.
export function Card({ title, icon, action, id, children }) {
  return (
    <section className="ehr-card" id={id}>
      <div className="ehr-card-h">
        <h4>
          {icon && <i className={'bi ' + icon} />} {title}
        </h4>
        {action}
      </div>
      {children}
    </section>
  );
}

// Grid of cards side by side (Synopsis, Episode).
export const CardGrid = ({ children }) => <div className="ehr-cards">{children}</div>;

// Small sidebar card: plain heading, compact body.
export function SideCard({ title, children }) {
  return (
    <section className="ehr-scard">
      <h5>{title}</h5>
      {children}
    </section>
  );
}

// Label / value table; rows without a value are left out. rows: [[label, value], …]
export function KvTable({ rows }) {
  return (
    <table className="ehr-kv">
      <tbody>
        {rows
          .filter(([, v]) => hasValue(v))
          .map(([l, v]) => (
            <tr key={l}>
              <th>{l}</th>
              <td>{v}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

// Grey "nothing here" line inside a card.
export const Note = ({ children }) => <p className="ehr-note">{children}</p>;

// Boxed "No data to display" (sidebar reports).
export const NoData = ({ children = 'No data to display' }) => (
  <div className="ehr-nodata">
    <i className="bi bi-info-circle" /> {children}
  </div>
);

// Small action button with an optional Bootstrap icon.
export function EhrButton({ icon, children, primary, ...rest }) {
  return (
    <button type="button" className={'ehr-btn' + (primary ? ' primary' : '')} {...rest}>
      {icon && <i className={'bi ' + icon} />} {children}
    </button>
  );
}

// Physician queries sent from this chart (Wrap-Up, Patient Message). who(q) = the label in bold.
export function QueryList({
  queries,
  who = (q) => (q.answered ? 'Answered' : 'Pending'),
  empty = 'No queries sent.',
}) {
  if (!queries.length) return <Note>{empty}</Note>;
  return (
    <ul className="ehr-edits">
      {queries.map((q) => (
        <li key={q.id} className={q.answered ? 'ok' : 'warn'}>
          <b>{who(q)}</b> — {q.question}
          {q.answered ? (
            <div className="ans">↳ {q.answer}</div>
          ) : (
            <div className="ans pend">Awaiting response</div>
          )}
        </li>
      ))}
    </ul>
  );
}

// Table with a header row and an empty message. cols: [label, …] (falsy = column hidden); children = <tr> rows.
export function EhrTable({ cols, empty, count, className = '', children }) {
  const shown = cols.filter(Boolean);
  return (
    <table className={'ehr-table compact ' + className}>
      <thead>
        <tr>
          {shown.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {children}
        {!count && (
          <tr>
            <td colSpan={shown.length} className="ehr-empty">
              {empty}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

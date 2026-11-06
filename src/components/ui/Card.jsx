/** Shared surface with an optional title and header actions. */
export function Card({ title, actions, children, className = '', ...props }) {
  return <section className={['card', className].filter(Boolean).join(' ')} {...props}>
    {(title || actions) && <div className="card-h">{title && <h3>{title}</h3>}{actions}</div>}
    {children}
  </section>;
}

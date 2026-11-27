/* Top system bar: brand, work queue, code search, chart search, counters, save status, timer, log out. */
import { initials } from '../lib/chartText.js';

export function SystemBar({
  user,
  onQueue,
  onLogout,
  codeSearch,
  sync,
  timer,
  onSearch,
  counters = [],
}) {
  const submit = (e) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q');
    if (q && onSearch) onSearch(String(q));
  };
  return (
    <div className="ehr-sysbar">
      <span className="brand">
        <i className="bi bi-grid-3x3-gap-fill" /> CODIVIA
      </span>
      <button type="button" onClick={onQueue}>
        <i className="bi bi-list-task" /> Work Queue
      </button>
      <span className="cs">{codeSearch}</span>
      <form className="search" role="search" onSubmit={submit}>
        <i className="bi bi-search" />
        <input name="q" placeholder="Search this chart (Enter)" aria-label="Search this chart" />
      </form>
      <div className="sp" />
      {counters.map((c) => (
        <button key={c.label} type="button" className="counter" onClick={c.onClick}>
          {c.label} {c.n}
        </button>
      ))}
      <span className="sync">{sync}</span>
      <span className="timer" title="Time on this chart (all sessions)">
        <i className="bi bi-stopwatch" /> {timer}
      </span>
      <button type="button" onClick={onLogout}>
        <i className="bi bi-box-arrow-right" /> Log Out
      </button>
      <span className="me" title={user}>
        {initials(user)}
      </span>
    </div>
  );
}

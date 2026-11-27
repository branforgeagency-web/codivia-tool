/* Sidebar › To Do: what is left before submitting (no diagnoses, pending queries, open edits). */
export function todoTasks({ edits, acks, draft, queries, onGo, onWrap }) {
  return [
    ...(!draft.dx.length
      ? [{ k: 'dx', sev: 'err', t: 'Code the visit diagnoses', go: () => onGo('dx') }]
      : []),
    ...queries
      .filter((q) => !q.answered)
      .map((q) => ({
        k: 'q' + q.id,
        sev: 'warn',
        t: 'Waiting for the physician: ' + q.question,
        go: onWrap,
      })),
    ...edits
      .filter((x) => x.sev === 'err' || (x.sev === 'warn' && !acks.includes(x.key)))
      .map((x) => ({ k: x.key, sev: x.sev, t: x.title + ' — ' + x.msg, go: () => onGo(x.tab) })),
  ];
}

// extra: more content under the task list (the edits / scrubber panel with acknowledge, notes, comments).
export function ToDo({ extra, ...props }) {
  const tasks = todoTasks(props);
  return (
    <>
      {tasks.length ? (
        <div className="ehr-todo">
          {tasks.map((x) => (
            <button key={x.k} type="button" className={'task ' + x.sev} onClick={x.go}>
              <i
                className={
                  'bi ' + (x.sev === 'err' ? 'bi-x-octagon-fill' : 'bi-exclamation-triangle-fill')
                }
              />
              <span>{x.t}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="ehr-ok">
          <i className="bi bi-check-circle-fill" /> Nothing left to do. Ready to submit.
        </p>
      )}
      {extra && <div className="ehr-todo-extra">{extra}</div>}
    </>
  );
}

/* CODIVIA platform — one allocated department on My Charts: icon, status, code sets,
   charts worked of assigned, remaining, accuracy, allocated range, and the open button.
   Props: dept = { key, name, group, elements, assigned, worked, avg, remaining, percent, range, status }
   (status: 'new' | 'active' | 'complete'), onOpen(key).
   Styles: .chart-department* in styles/app.css + refinements.css */
import { DeptIcon } from '../ui/DeptIcon.jsx';
import { ElementTiles } from '../ui/ElementTiles.jsx';

const STATUS_LABEL = { complete: 'Completed', active: 'In progress', new: 'Not started' };

export function DeptChartCard({ dept: d, onOpen }) {
  const done = d.status === 'complete';
  return (
    <article className="chart-department">
      <div className="chart-department-top">
        <div className="chart-department-title">
          <span className="chart-department-icon" aria-hidden="true">
            <DeptIcon dept={d.key} />
          </span>
          <h3>{d.name}</h3>
        </div>
        <span className={'chart-status ' + d.status}>{STATUS_LABEL[d.status]}</span>
      </div>
      <ElementTiles dept={d} setting={d.group === 'setting'} />
      <div className="chart-progress-label">
        <span>
          {d.worked} <span>of {d.assigned} worked</span>
        </span>
        <b>{d.percent}%</b>
      </div>
      <progress
        className="chart-progress"
        value={d.worked}
        max={d.assigned || 1}
        aria-label={d.name + ' chart progress'}
      />
      <div className="chart-department-details">
        <span>{d.remaining} remaining</span>
        <span>{d.worked ? d.avg + '% avg accuracy' : 'Your next challenge'}</span>
      </div>
      <div className="chart-department-footer">
        <span>{d.range ? `Charts ${d.range.start}–${d.range.end}` : 'No charts assigned'}</span>
        <button
          type="button"
          className={'btn ' + (done ? 'btn-ghost' : 'btn-teal')}
          onClick={() => onOpen(d.key)}
          aria-label={'Open ' + d.name + ' charts'}
        >
          {done ? 'Review charts' : d.worked ? 'Continue coding' : 'Start coding'}{' '}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}

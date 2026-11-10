/* CODIVIA platform — admin view of one department: code sets, how much of the chart pool is
 * allocated (ring), pool / allocated / available / students, and the "Manage allocation" action.
 * Built on the shared DeptCard shell.
 * Props: deptKey, dept ({ name, group, elements }), pool, allocated, students, onManage(deptKey)
 */
import { DeptCard } from '../ui/DeptCard.jsx';
import { ElementTiles } from '../ui/ElementTiles.jsx';
import { ProgressRing } from '../ui/ProgressRing.jsx';

const GROUP_LABEL = { specialty: 'Specialty track', setting: 'Setting domain' };

// Pool usage → badge. Allocations can overlap, so "allocated" may exceed the pool.
function usageBadge(allocated, pool) {
  if (!allocated) return { label: 'Unallocated', tone: 'muted' };
  if (allocated >= pool) return { label: 'Fully allocated', tone: 'danger' };
  if (allocated / pool >= 0.75) return { label: 'Filling up', tone: 'warn' };
  return { label: 'Available', tone: 'ok' };
}

export function AdminDeptCard({ deptKey, dept, pool, allocated, students, onManage }) {
  const available = Math.max(0, pool - allocated);
  const used = pool ? Math.min(100, Math.round((allocated / pool) * 100)) : 0;

  return (
    <DeptCard
      deptKey={deptKey}
      name={dept.name}
      meta={deptKey + ' · ' + (GROUP_LABEL[dept.group] || dept.group)}
      badge={usageBadge(allocated, pool)}
      footer={
        <button type="button" className="dc-action" onClick={() => onManage(deptKey)}>
          Manage allocation <span aria-hidden="true">→</span>
        </button>
      }
    >
      <ElementTiles dept={dept} setting={dept.group === 'setting'} />

      <div className="dc-metrics">
        <ProgressRing value={used} tone="brand" size={72} stroke={7} label="used" />
        <dl className="dc-stats">
          <div>
            <dt>Pool</dt>
            <dd>{pool.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Allocated</dt>
            <dd>{allocated.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Available</dt>
            <dd className={available ? 'ok' : 'danger'}>{available.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Students</dt>
            <dd>{students}</dd>
          </div>
        </dl>
      </div>
    </DeptCard>
  );
}

/* CODIVIA platform — admin view of one department: code sets, how much of the chart pool is
 * allocated (ring), pool / allocated / available / students, and the "Manage allocation" action.
 * Built on the shared DeptCard shell.
 * Props: deptKey, dept ({ name, icon, group, elements, isActive }), pool, allocated, students, onManage(deptKey),
 *        onEdit(dept) / onDelete(dept) — optional, show the pencil / bin buttons
 */
import { DeptCard } from '../ui/DeptCard.jsx';
import { ElementTiles } from '../ui/ElementTiles.jsx';
import { ProgressRing } from '../ui/ProgressRing.jsx';

const GROUP_LABEL = { specialty: 'Specialty track', setting: 'Setting domain' };

// Pool usage → badge. Allocations can overlap, so "allocated" may exceed the pool.
function usageBadge(allocated, pool, isActive) {
  if (isActive === false) return { label: 'Inactive', tone: 'muted' };
  if (!pool) return { label: 'No charts yet', tone: 'warn' };
  if (!allocated) return { label: 'Unallocated', tone: 'muted' };
  if (allocated >= pool) return { label: 'Fully allocated', tone: 'danger' };
  if (allocated / pool >= 0.75) return { label: 'Filling up', tone: 'warn' };
  return { label: 'Available', tone: 'ok' };
}

export function AdminDeptCard({ deptKey, dept, pool, allocated, students, onManage, onEdit, onDelete }) {
  const available = Math.max(0, pool - allocated);
  const used = pool ? Math.min(100, Math.round((allocated / pool) * 100)) : 0;

  return (
    <DeptCard
      deptKey={deptKey}
      icon={dept.icon}
      name={dept.name}
      meta={deptKey + ' · ' + (GROUP_LABEL[dept.group] || dept.group)}
      badge={usageBadge(allocated, pool, dept.isActive)}
      tools={
        (onEdit || onDelete) && (
          <span className="sc-tools">
            {onEdit && (
              <button type="button" className="sc-icon" onClick={() => onEdit({ key: deptKey, ...dept })} title="Edit department" aria-label={'Edit ' + dept.name}>
                <i className="bi bi-pencil" aria-hidden="true" />
              </button>
            )}
            {onDelete && (
              <button type="button" className="sc-icon danger" onClick={() => onDelete({ key: deptKey, ...dept, pool })} title="Delete department" aria-label={'Delete ' + dept.name}>
                <i className="bi bi-trash" aria-hidden="true" />
              </button>
            )}
          </span>
        )
      }
      footer={
        <button type="button" className="dc-action" onClick={() => onManage(deptKey)} disabled={!pool} title={pool ? '' : 'Upload and publish charts to this department first'}>
          {pool ? 'Manage allocation' : 'No charts to allocate'} <span aria-hidden="true">→</span>
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

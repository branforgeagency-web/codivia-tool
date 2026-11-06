import { useId } from 'react';

/** Controlled tabs. Render the selected content in a panel with panelProps. */
export function useTabPanel() {
  const id = useId();
  return { id, panelProps: { id: id + '-panel', role: 'tabpanel', 'aria-labelledby': id + '-active', tabIndex: 0 } };
}

export function Tabs({ items, value, onChange, label, id, className = '', tabClassName = '', activeClassName = 'active' }) {
  function selectByKey(event, index) {
    const enabled = items.filter(item => !item.disabled);
    const current = enabled.findIndex(item => item.value === items[index].value);
    let next;
    if (event.key === 'ArrowRight') next = enabled[(current + 1) % enabled.length];
    if (event.key === 'ArrowLeft') next = enabled[(current - 1 + enabled.length) % enabled.length];
    if (event.key === 'Home') next = enabled[0];
    if (event.key === 'End') next = enabled[enabled.length - 1];
    if (!next) return;
    event.preventDefault();
    onChange(next.value);
    const buttons = event.currentTarget.parentElement.querySelectorAll('[role="tab"]');
    buttons[items.indexOf(next)].focus();
  }
  return <div className={className} role="tablist" aria-label={label}>
    {items.map((item, index) => <button key={item.value} type="button" role="tab"
      id={item.value === value ? id + '-active' : undefined}
      aria-controls={id + '-panel'} aria-selected={item.value === value}
      tabIndex={item.value === value ? 0 : -1} disabled={item.disabled}
      className={[tabClassName, item.className, item.value === value && activeClassName].filter(Boolean).join(' ')}
      onClick={() => onChange(item.value)} onKeyDown={event => selectByKey(event, index)}>
      {item.label}
    </button>)}
  </div>;
}

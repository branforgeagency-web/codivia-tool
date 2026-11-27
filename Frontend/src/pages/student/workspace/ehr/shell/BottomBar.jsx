/* Bottom action bar: ADD DX, the page's actions, the edit status and the Submit button.
   actions: [{ label, icon, onClick, disabled }]; status: [tone, text]. */
export function BottomBar({ dxCount, onAddDx, status, actions, submit }) {
  return (
    <div className="ehr-bottom">
      <button type="button" className="ehr-bb" onClick={onAddDx}>
        <i className="bi bi-plus-lg" /> ADD DX ({dxCount})
      </button>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          className="ehr-bb"
          onClick={a.onClick}
          disabled={a.disabled}
        >
          {a.icon && <i className={'bi ' + a.icon} />} {a.label}
        </button>
      ))}
      <div className="sp" />
      <span className={'ehr-status ' + status[0]}>{status[1]}</span>
      {submit}
    </div>
  );
}

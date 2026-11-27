/* Open-patient tab strip under the system bar; ✕ closes the chart (back to the work queue). */
export function PatientTabs({ name, chartId, onClose }) {
  return (
    <div className="ehr-pttabs">
      <span className="pt on">
        <i className="bi bi-person-vcard" /> {name || 'Patient'} <small>{chartId}</small>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chart and return to the work queue"
          title="Close chart"
        >
          <i className="bi bi-x-lg" />
        </button>
      </span>
    </div>
  );
}

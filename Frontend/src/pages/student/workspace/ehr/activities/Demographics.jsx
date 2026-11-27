import { useState } from 'react';
import { ActivityHeader, Note } from '../ui/index.js';

// Demographics: one section per tab (Basics, Employer and Identification …) stacked like the EHR;
// the tab links jump to a section. Tabs, groups and labels come from the server (chart.demographics).
// The pencil opens a section form; edits are for practice only and stay on this screen.
export function Demographics({ chart, onClose }) {
  const layout = chart.demographics || { tabs: [], fields: [], valueLabels: {} };
  const [active, setActive] = useState((layout.tabs[0] || {}).key);
  const [editing, setEditing] = useState(null);
  const [local, setLocal] = useState({}); // practice edits: { fieldKey: value }
  const [draftVals, setDraftVals] = useState({});
  const p = chart.patient || {};
  const details = p.details || {};
  const raw = (f) => {
    if (f.key in local) return local[f.key];
    if (!f.from) return details[f.key] || '';
    const [obj, k] = f.from.split('.');
    const v = ((obj === 'patient' ? p : chart.encounter) || {})[k];
    return (
      (layout.valueLabels[k] && layout.valueLabels[k][v]) ||
      (v === undefined || v === null ? '' : String(v))
    );
  };
  const fieldsOf = (tab) => layout.fields.filter((f) => f.tab === tab);
  const groupsOf = (tab) => [...new Set(fieldsOf(tab).map((f) => f.group))];
  const jump = (key) => {
    setActive(key);
    const el = document.getElementById('demo-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const startEdit = (key) => {
    setEditing(key);
    setActive(key);
    setDraftVals(Object.fromEntries(fieldsOf(key).map((f) => [f.key, raw(f)])));
  };
  const move = (dir) => {
    const i = layout.tabs.findIndex((t) => t.key === editing);
    const next = layout.tabs[i + dir];
    if (next) startEdit(next.key);
  };
  const shown = (v) => v || '—';

  return (
    <div className="ehr-act ehr-demo">
      <ActivityHeader title="Demographics" onClose={onClose} />
      <nav className="ehr-demonav" aria-label="Demographics sections">
        {layout.tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={active === t.key ? 'on' : ''}
            onClick={() => jump(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {layout.tabs.map((t) => {
        const isEdit = editing === t.key;
        const basics = t.key === layout.tabs[0].key;
        const head = basics ? fieldsOf(t.key).filter((f) => !f.group) : [];
        return (
          <section
            key={t.key}
            id={'demo-' + t.key}
            className={'ehr-demosec' + (active === t.key ? ' focus' : '')}
            onClick={() => setActive(t.key)}
          >
            <h3>
              {t.label}
              {!isEdit && (
                <button
                  type="button"
                  className="ehr-pencil"
                  onClick={() => startEdit(t.key)}
                  aria-label={'Edit ' + t.label}
                  title="Edit"
                >
                  <i className="bi bi-pencil" />
                </button>
              )}
            </h3>
            {isEdit ? (
              <div className="ehr-demoform">
                <p className="ehr-small">
                  Practice edit: changes show on this screen only and are not saved to the chart.
                </p>
                {groupsOf(t.key).map((g) => (
                  <div key={g || 'main'} className="grp">
                    {g && <h4>{g}</h4>}
                    <div className="grid">
                      {fieldsOf(t.key)
                        .filter((f) => f.group === g)
                        .map((f) => (
                          <label key={f.key}>
                            <span>{f.label}</span>
                            <input
                              className="ehr-input"
                              value={draftVals[f.key] || ''}
                              readOnly={!!f.from}
                              onChange={(e) =>
                                setDraftVals((d) => ({ ...d, [f.key]: e.target.value }))
                              }
                            />
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
                <div className="acts">
                  <button
                    type="button"
                    className="ehr-btn"
                    onClick={() => (
                      setLocal((l) => ({
                        ...l,
                        ...Object.fromEntries(
                          fieldsOf(t.key)
                            .filter((f) => !f.from)
                            .map((f) => [f.key, draftVals[f.key] || '']),
                        ),
                      })),
                      setEditing(null)
                    )}
                  >
                    <i className="bi bi-check-lg" /> Close
                  </button>
                  <button type="button" className="ehr-btn" onClick={() => setEditing(null)}>
                    <i className="bi bi-x-lg" /> Cancel
                  </button>
                  <div className="sp" />
                  <button
                    type="button"
                    className="ehr-btn"
                    disabled={layout.tabs[0].key === t.key}
                    onClick={() => move(-1)}
                  >
                    <i className="bi bi-arrow-up" /> Previous
                  </button>
                  <button
                    type="button"
                    className="ehr-btn"
                    disabled={layout.tabs[layout.tabs.length - 1].key === t.key}
                    onClick={() => move(1)}
                  >
                    <i className="bi bi-arrow-down" /> Next
                  </button>
                </div>
              </div>
            ) : (
              <>
                {basics && (
                  <div className="ehr-demohead">
                    <div className="sil" aria-hidden="true">
                      <i className="bi bi-person-fill" />
                    </div>
                    {head.map((f) => (
                      <div key={f.key} className="fv">
                        <span>{f.label}</span>
                        <b>{shown(raw(f))}</b>
                      </div>
                    ))}
                  </div>
                )}
                {groupsOf(t.key)
                  .filter((g) => !(basics && !g))
                  .map((g) => (
                    <div key={g || 'main'} className="grp">
                      {g && <h4>{g}</h4>}
                      <div className="grid">
                        {fieldsOf(t.key)
                          .filter((f) => f.group === g)
                          .map((f) => (
                            <div key={f.key} className="fv">
                              <span>{f.label}</span>
                              <b>{shown(raw(f))}</b>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </>
            )}
          </section>
        );
      })}
      {!layout.tabs.length && <Note>Demographics are not available for this chart.</Note>}
    </div>
  );
}

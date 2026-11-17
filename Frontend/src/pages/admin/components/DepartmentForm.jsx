import { useEffect, useState } from 'react';
import { DeptIcon } from '../../../components/ui/DeptIcon.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { PageLoader } from '../../../components/ui/PageLoader.jsx';
import { get, patch, post } from '../../../services/apiHelper.js';
import { DEPARTMENT, DEPARTMENTS, DEPARTMENTS_META } from '../../../services/endpoints.js';

// ---- Admin: add or edit a department (Departments page → Add department / pencil). Styles: .md-* / .as-* / .df-*
// Options (groups, code sets) come from GET /departments/meta.
// Add:  POST /departments { key, name, icon, group, elements, isActive }
// Edit: PATCH /departments/:key { name?, icon?, group?, elements?, isActive? } (the key cannot change). ----

const KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,19}$/;

export function DepartmentForm({ dept, onClose, onSaved }) {
  const editing = !!dept;
  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState('');
  const [key, setKey] = useState(dept ? dept.key : '');
  const [name, setName] = useState(dept ? dept.name : '');
  const [icon, setIcon] = useState(dept ? dept.icon || '' : '');
  const [group, setGroup] = useState(dept ? dept.group : '');
  const [elements, setElements] = useState(dept ? dept.elements || [] : []);
  const [isActive, setIsActive] = useState(dept ? dept.isActive !== false : true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let live = true;
    get(DEPARTMENTS_META)
      .then((m) => {
        if (!live) return;
        setMeta(m);
        if (!dept && m.groups[0]) setGroup((g) => g || m.groups[0].key);
      })
      .catch((e) => live && setMetaError(e.message || 'Could not load the department options.'));
    return () => {
      live = false;
    };
  }, [dept]);

  const toggleElement = (k) => setElements((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  // Edit sends only what changed.
  const changes = () => {
    const c = {};
    if (name.trim() !== dept.name) c.name = name.trim();
    if (icon.trim() !== (dept.icon || '')) c.icon = icon.trim();
    if (group !== dept.group) c.group = group;
    const before = [...(dept.elements || [])].sort().join(',');
    if ([...elements].sort().join(',') !== before) c.elements = elements;
    if (isActive !== (dept.isActive !== false)) c.isActive = isActive;
    return c;
  };
  const dirty = !editing || Object.keys(changes()).length > 0;

  const submit = async (ev) => {
    ev.preventDefault();
    if (busy || !dirty) return;
    setError('');
    setFieldErrors({});
    const errs = {};
    if (!editing && !KEY_PATTERN.test(key)) errs.key = '2–20 capital letters, digits or _ , starting with a letter (e.g. NEURO).';
    if (!name.trim()) errs.name = 'Enter the department name.';
    if (!group) errs.group = 'Choose a group.';
    if (!elements.length) errs.elements = 'Choose at least one code set.';
    if (Object.keys(errs).length) return setFieldErrors(errs);
    setBusy(true);
    try {
      const saved = editing
        ? await patch(DEPARTMENT(dept.key), changes())
        : await post(DEPARTMENTS, { key, name: name.trim(), icon: icon.trim(), group, elements, isActive });
      onSaved && onSaved(saved);
      onClose();
    } catch (e) {
      const details = (e.data && e.data.details) || [];
      if (details.length) setFieldErrors(Object.fromEntries(details.map((d) => [d.field.split('.')[0], d.message])));
      else setError(e.message || 'Could not save the department.');
    }
    setBusy(false);
  };

  return (
    <Modal
      title={editing ? 'Edit department' : 'Add department'}
      subtitle={editing ? dept.key : 'Students see it once it has published charts and is active'}
      icon={
        <span className="md-avatar" aria-hidden="true">
          <DeptIcon dept={editing ? dept.key : key} icon={icon} />
        </span>
      }
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sc-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="department-form" className="dc-action" disabled={busy || !dirty || !meta}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add department'}
          </button>
        </>
      }
    >
      {metaError ? (
        <div className="cvx-msg err" role="alert">
          {metaError}
        </div>
      ) : !meta ? (
        <PageLoader variant="inline" label="Loading options" />
      ) : (
        <form id="department-form" className="as-form" onSubmit={submit} noValidate>
          <div className="df-row">
            <label className="as-field">
              <span>Key</span>
              <input
                value={key}
                disabled={editing}
                maxLength={20}
                autoFocus={!editing}
                onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="e.g. NEURO"
                aria-invalid={!!fieldErrors.key}
              />
              <small>{editing ? 'The key cannot be changed: charts and allocations use it.' : 'Short code used in chart IDs (NEURO-0001). Cannot be changed later.'}</small>
              {fieldErrors.key && <em>{fieldErrors.key}</em>}
            </label>
            <label className="as-field df-icon">
              <span>Icon</span>
              <input value={icon} maxLength={16} onChange={(e) => setIcon(e.target.value)} placeholder="🧠" aria-invalid={!!fieldErrors.icon} />
              <small>An emoji (optional).</small>
              {fieldErrors.icon && <em>{fieldErrors.icon}</em>}
            </label>
          </div>
          <label className="as-field">
            <span>Name</span>
            <input value={name} maxLength={100} autoFocus={editing} onChange={(e) => setName(e.target.value)} placeholder="e.g. Neurology" aria-invalid={!!fieldErrors.name} />
            {fieldErrors.name && <em>{fieldErrors.name}</em>}
          </label>
          <fieldset className="as-field">
            <legend>Group</legend>
            <div className="df-chips" role="radiogroup">
              {meta.groups.map((g) => (
                <label key={g.key} className={group === g.key ? 'on' : ''}>
                  <input type="radio" name="dept-group" checked={group === g.key} onChange={() => setGroup(g.key)} /> {g.label}
                </label>
              ))}
            </div>
            {fieldErrors.group && <em>{fieldErrors.group}</em>}
          </fieldset>
          <fieldset className="as-field">
            <legend>Code sets students use in this department</legend>
            <div className="df-chips">
              {meta.elements.map((el) => (
                <label key={el.key} className={elements.includes(el.key) ? 'on' : ''}>
                  <input type="checkbox" checked={elements.includes(el.key)} onChange={() => toggleElement(el.key)} /> {el.label}
                </label>
              ))}
            </div>
            <small>Decides the coding workspace: E/M → level picker; CPT / HCPCS → charge lines; ICD-10-PCS / MS-DRG → inpatient (POA, procedures, DRG, abstract).</small>
            {fieldErrors.elements && <em>{fieldErrors.elements}</em>}
          </fieldset>
          <label className="df-switch">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>
              <b>Active</b> — {isActive ? 'students allocated to it can see and work its charts.' : 'hidden from students; allocations and scores are kept.'}
            </span>
          </label>
          {error && (
            <div className="cvx-msg err" role="alert">
              {error}
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}

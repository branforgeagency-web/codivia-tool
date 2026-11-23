import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import React from 'react';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { validateCode } from '../../utils/codes.js';
import { scanPHI } from '../../utils/phi.js';
import { del, get, patch, post } from '../../services/apiHelper.js';
import { checkMediaFile, uploadMedia } from '../../services/media.service.js';
import {
  ADMIN_CHART,
  ADMIN_UPLOAD,
  ADMIN_UPLOADS,
  ADMIN_UPLOADS_EXTRACT,
  ADMIN_UPLOAD_STATUS,
  DEPARTMENTS,
} from '../../services/endpoints.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import { CaseFields, caseIssues, emptyCase, fromCase, toCasePayload } from './UploadCase.jsx';
import { useReference, workTypeInfo } from '../../hooks/useReference.js';

// Data: /admin/uploads. The record text is extracted on the server (POST /admin/uploads/extract);
// the text, the chart setup (work type, patient, documents, encounter, original charges, denial,
// grading extras) and the answer key are sent: the same structure as a published chart.
// The original file is stored in S3 through POST /media-upload (uploadMedia); its key is saved
// with the upload as sourceFile, so the list can link to it.
//
// Edit mode: /admin/upload?chart=EM-0001 (a chart in the pool, from Browse Charts) or ?upload=<id>
// (an uploaded chart, from the list below). The same form loads the saved chart; Save sends PATCH
// /admin/charts/:id or PATCH /admin/uploads/:id. A chart keeps its ID, department and position.

const DX_TYPES = ['PDx', 'SDx', 'Dx'];
const LINE_TYPES = ['CPT', 'HCPCS'];
const NOT_A_CODE = ['DRG', 'PDGM']; // not in the code database, so not validated against it
const blankRow = (type = 'SDx') => ({ code: '', type, desc: '', why: '', poa: '', mods: '', units: '', ptrs: '', valid: null });
const csv = (s) =>
  String(s || '')
    .split(/[,\s]+/)
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
const validFor = (code, type) => (NOT_A_CODE.includes(type) ? null : validateCode(code));
// Saved answer key -> form rows. mods [] means "must carry no modifier" ('-' in the form).
const rowsFromKey = (key) =>
  (key || []).map((r) => ({
    ...blankRow(r.type || 'SDx'),
    code: r.code || '',
    type: r.type || 'SDx',
    desc: r.desc || '',
    why: r.why || '',
    poa: r.poa || '',
    mods: Array.isArray(r.mods) ? (r.mods.length ? r.mods.join(',') : '-') : '',
    units: r.units ? String(r.units) : '',
    ptrs: (r.ptrs || []).join(','),
    valid: validFor(r.code || '', r.type || 'SDx'),
  }));

export function AdminUpload() {
  const [file, setFile] = useState(null);
  // The chosen file once stored in S3: { key, url, size, mimeType }; null until then (or on failure).
  const [stored, setStored] = useState(null);
  const [fileNote, setFileNote] = useState('');
  const [text, setText] = useState('');
  const [dept, setDept] = useState('GENSURG');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [phi, setPhi] = useState([]);
  const [key, setKey] = useState([]); // suggested answer key rows
  const [cs, setCs] = useState(emptyCase); // chart setup: work type, patient, documents, encounter …
  const { ref: lists } = useReference(); // option lists from the database
  const [statusTab, setStatusTab] = useState('all');
  const { refreshAll: refreshAdmin, version, setNotice } = useAdmin();
  // Edit mode: { kind: 'chart' | 'upload', id, label, status, chartId }; null = a new upload.
  const [editing, setEditing] = useState(null);
  const [urlParams, setUrlParams] = useSearchParams();
  const topRef = useRef(null);
  // Save / publish: which button is working ('draft' | 'publish' | 'save' | 'savePublish'), the
  // check that failed ('draft' | 'publish': its problems stay listed, and update, until fixed),
  // and the server's error. fileKey remounts the file input so a reset clears the chosen file.
  const [saving, setSaving] = useState(null);
  const [check, setCheck] = useState(null);
  const [saveErr, setSaveErr] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const issuesRef = useRef(null);
  // Uploaded charts, newest first, 10 per page (GET /admin/uploads).
  const uploads = useApiList(ADMIN_UPLOADS, { params: { status: statusTab }, reloadKey: version });
  const drafts = uploads.results;
  const loadingDrafts = !uploads.data && !uploads.error;
  const refresh = uploads.reload;
  // Department choices from the database (GET /departments, every active department).
  const [departments, setDepartments] = useState([]);
  useEffect(() => {
    get(DEPARTMENTS)
      .then((r) => setDepartments(r.results || []))
      .catch((e) => setErr('Could not load departments: ' + e.message));
  }, []);
  const deptOf = (k) => departments.find((d) => d.key === k || d.id === k);
  const inpatient = ((deptOf(dept) || {}).elements || []).some((e) => e === 'ICD10PCS' || e === 'DRG');
  // DRG validation is inpatient only (checked once the departments are loaded, so a chart being
  // loaded for editing keeps its work type).
  useEffect(() => {
    if (departments.length && !inpatient && cs.workType === 'drg') setCs((c) => ({ ...c, workType: 'code' }));
  }, [departments.length, inpatient, cs.workType]);

  // Fill the form from a saved chart or upload.
  const loadInto = (src, edit) => {
    setErr('');
    setFile(null);
    setStored(null);
    setFileNote('');
    setDept(src.dept);
    setTitle(src.title || '');
    setText(src.record || '');
    setPhi(scanPHI(src.record || ''));
    setKey(rowsFromKey(src.answerKey));
    setCs(fromCase(src));
    setEditing(edit);
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const chartParam = urlParams.get('chart');
  const uploadParam = urlParams.get('upload');
  useEffect(() => {
    if (!chartParam && !uploadParam) return undefined;
    let cancelled = false;
    setBusy('Loading the chart\u2026');
    const req = chartParam ? get(ADMIN_CHART(chartParam)) : get(ADMIN_UPLOAD(uploadParam));
    req
      .then((src) => {
        if (cancelled) return;
        if (chartParam) loadInto(src, { kind: 'chart', id: src.id, label: src.id, status: 'published', uploaded: src.uploaded });
        else loadInto(src, { kind: 'upload', id: src.id, label: src.chart || 'Draft', status: src.status, chartId: src.chart });
      })
      .catch((e) => !cancelled && setErr('Could not load the chart to edit: ' + e.message))
      .finally(() => !cancelled && setBusy(''));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartParam, uploadParam]);

  const clearForm = () => {
    setFile(null);
    setStored(null);
    setFileNote('');
    setFileKey((k) => k + 1); // the file input shows no file again
    setText('');
    setKey([]);
    setCs(emptyCase());
    setDept('GENSURG');
    setTitle('');
    setPhi([]);
    setErr('');
    setCheck(null);
    setSaveErr('');
    setEditing(null);
    if (urlParams.get('chart') || urlParams.get('upload')) setUrlParams({}, { replace: true });
  };
  const editUpload = (d) => setUrlParams({ upload: d.id });

  const readFile = async (f) => {
    setErr('');
    if (!editing) setKey([]);
    setFile(f);
    setStored(null);
    setFileNote('');
    setBusy('Extracting text and storing the file\u2026');
    try {
      checkMediaFile(f, 'charts');
      const form = new FormData();
      form.append('file', f);
      // Text extraction and the S3 upload (POST /media-upload) run together. A failed S3 upload
      // doesn't block the chart: the text is still used and the chart is saved without the file.
      const [result, media] = await Promise.all([
        post(ADMIN_UPLOADS_EXTRACT, form),
        uploadMedia(f, { folder: 'charts' }).catch((ex) => {
          setFileNote('The original file could not be stored (' + (ex.message || ex) + '). The chart will be saved without it.');
          return null;
        }),
      ]);
      if (media) setStored({ key: media.key, url: media.url, size: media.size, mimeType: media.mimeType });
      const t = (result && result.text) || '';
      if (!t) throw new Error('No text was returned by the extraction service.');
      setText(t);
      setPhi(scanPHI(t));
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    } catch (ex) {
      setErr(ex.message || String(ex));
      setText('');
      setPhi([]);
    } finally {
      setBusy('');
    }
  };

  const suggest = async () => {
    setErr('');
    setBusy('Asking Claude for a suggested answer key\u2026');
    try {
      const d = deptOf(dept) || { name: dept, elements: [] };
      const prompt =
        'You are a certified medical coding auditor. Read the clinical record below and produce the correct answer key.\n\n' +
        'Department: ' +
        d.name +
        '\nCode sets in scope: ' +
        (d.elements || []).join(', ') +
        '\n\n' +
        'RECORD:\n' +
        text.slice(0, 12000) +
        '\n\n' +
        'Return ONLY valid JSON, no markdown, no preamble, in exactly this shape:\n' +
        '{"title":"short diagnosis-style title","codes":[{"code":"K43.2","type":"PDx","desc":"short official description","why":"one or two sentences explaining why this code, citing the note"}]}\n\n' +
        'Rules: type must be one of PDx, SDx, CPT, HCPCS, MOD, PCS. Put the principal diagnosis first as PDx. ' +
        'Only include an E/M code if this department bills E/M. Include modifier rows (type MOD) where required, e.g. 25 with an E/M plus a procedure. ' +
        'Every row must have a why. Use only real, currently valid codes.';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const raw = (data.content || [])
        .filter((x) => x.type === 'text')
        .map((x) => x.text)
        .join('\n');
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (parsed.title && !title) setTitle(parsed.title);
      const rows = (parsed.codes || []).map((c) => ({
        ...blankRow((c.type || 'PDx').trim()),
        code: (c.code || '').trim(),
        desc: (c.desc || '').trim(),
        why: (c.why || '').trim(),
        valid: validFor((c.code || '').trim(), (c.type || 'PDx').trim()),
      }));
      if (!rows.length)
        throw new Error('No codes were returned. Review the record text and try again.');
      setKey(rows);
    } catch (ex) {
      setErr('Suggestion failed: ' + (ex.message || ex));
    }
    setBusy('');
  };

  const setRow = (i, f, v) =>
    setKey((k) =>
      k.map((r, ix) =>
        ix === i
          ? { ...r, [f]: v, valid: f === 'code' ? validFor(v, r.type) : f === 'type' ? validFor(r.code, v) : r.valid }
          : r,
      ),
    );
  const addRow = () => setKey((k) => [...k, blankRow()]);
  const delRow = (i) => setKey((k) => k.filter((_, ix) => ix !== i));

  // Everything that stops a save, as { path, msg } (path = the field's data-field). 'draft' checks
  // what the server needs to store it; 'publish' (and saving a live chart) also checks what students
  // need: a complete answer key with a PDx, and the work type's setup. Same rules as the server.
  const collectIssues = (mode) => {
    const publishing = mode === 'publish';
    const out = [];
    const add = (path, msg) => out.push({ path, msg });
    if (!dept) add('dept', 'Choose a department.');
    if (!title.trim()) add('title', 'Add a chart title.');
    else if (title.trim().length > 200) add('title', 'The chart title is too long (200 characters at most).');
    if (!text.trim()) add('record', 'The record text is empty.');
    if (publishing) {
      if (!key.length) add('key', 'Add at least one code to the answer key.');
      key.forEach((r, i) => {
        const row = 'Code ' + (i + 1) + (r.code.trim() ? ' (' + r.code.trim() + ')' : '');
        if (!r.code.trim()) add(`key.${i}.code`, row + ': enter the code.');
        else if (r.valid === false && !NOT_A_CODE.includes(r.type)) add(`key.${i}.code`, row + ': not found in the code database.');
        if (!r.desc.trim()) add(`key.${i}.desc`, row + ': add the description.');
        if (!r.why.trim()) add(`key.${i}.why`, row + ': add why this code is reported.');
      });
      if (key.length && !key.some((r) => r.type === 'PDx')) add('key.0.type', 'Mark one code as PDx (principal diagnosis).');
    }
    out.push(...caseIssues(cs, { inpatient, publish: publishing }));
    return out;
  };
  const issues = check ? collectIssues(check) : [];
  const badFields = new Set(issues.map((x) => x.path));
  const flag = (path) => ({ 'data-field': path, 'aria-invalid': badFields.has(path) ? true : undefined });
  // Jump to a field named in the problem list.
  const focusField = (path) => {
    const el = document.querySelector(`[data-field="${path}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof el.focus === 'function') el.focus({ preventScroll: true });
  };
  // Runs the check for a save; on problems, lists them by the buttons and keeps them updated.
  const passes = (mode) => {
    const found = collectIssues(mode);
    setCheck(found.length ? mode : null);
    if (found.length) requestAnimationFrame(() => issuesRef.current && issuesRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return !found.length;
  };
  // A save that failed on the server, in words the admin can act on. The form is kept as it is.
  const saveError = (ex) => {
    const msg = (ex && ex.message) || String(ex);
    if (!ex || !ex.status) {
      if (/fetch|network|load failed/i.test(msg)) return 'Could not reach the server. Check your connection and try again; nothing in the form was lost.';
      return msg;
    }
    if (ex.status === 401) return 'Your session has ended. Sign in again, then save; nothing in the form was lost.';
    if (ex.status === 403) return 'Your account is not allowed to save charts.';
    if (ex.status === 413) return 'The chart is too large to save. Shorten the record or remove a source document.';
    if (ex.status >= 500) return 'The server could not save the chart (' + msg + '). Try again; nothing in the form was lost.';
    return msg;
  };
  const showSaveErr = (text) => {
    setSaveErr(text);
    requestAnimationFrame(() => issuesRef.current && issuesRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  // The chart as the API stores it (new upload, edited upload or edited chart).
  const buildBody = () => ({
    title: title || 'Uploaded chart',
    record: text,
    ...toCasePayload(cs, { inpatient }),
    answerKey: key.map((r) => {
      const row = { code: r.code, type: r.type, desc: r.desc, why: r.why };
      if (DX_TYPES.includes(r.type) && inpatient && r.poa) row.poa = r.poa;
      if (LINE_TYPES.includes(r.type)) {
        // Blank = not graded; "-" = the line must carry no modifier.
        if (r.mods.trim()) row.mods = r.mods.trim() === '-' ? [] : csv(r.mods).slice(0, 4);
        if (r.units) row.units = Number(r.units);
        if (csv(r.ptrs).length) row.ptrs = csv(r.ptrs).slice(0, 4);
      }
      return row;
    }),
  });

  // After a successful save: empty form at the top of the page, and the notice says what happened.
  const done = (text) => {
    clearForm();
    setNotice({ tone: 'ok', text });
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // New upload: Publish to students / Save as draft.
  const publish = async (asDraft) => {
    if (saving || busy) return;
    setErr('');
    setSaveErr('');
    if (!passes(asDraft ? 'draft' : 'publish')) return;
    setSaving(asDraft ? 'draft' : 'publish');
    const name = title.trim();
    try {
      const out = await post(ADMIN_UPLOADS, { dept, ...buildBody(), sourceName: file ? file.name : null, sourceFile: stored, status: asDraft ? 'draft' : 'published' });
      done(asDraft ? `Saved \u201c${name}\u201d as a draft. Students can't see it until you publish it.` : `Published \u201c${name}\u201d${out && out.chart ? ' as ' + out.chart : ''}. It is now in the chart pool.`);
      refresh();
      if (!asDraft) refreshAdmin(); // the department's chart pool grew
    } catch (ex) {
      showSaveErr((asDraft ? 'Could not save the draft: ' : 'Could not publish: ') + saveError(ex));
    } finally {
      setSaving(null);
    }
  };

  // Edit mode: save the changes. A live chart (or published upload) must pass the publish checks;
  // a draft can be saved as it is, or saved and published in one go.
  const saveEdit = async (andPublish = false) => {
    if (saving || busy) return;
    setErr('');
    setSaveErr('');
    const live = editing.kind === 'chart' || editing.status === 'published';
    if (!passes(live || andPublish ? 'publish' : 'draft')) return;
    setSaving(andPublish ? 'savePublish' : 'save');
    const name = title.trim() || editing.label;
    let saved = false;
    try {
      if (editing.kind === 'chart') await patch(ADMIN_CHART(editing.id), buildBody());
      else {
        await patch(ADMIN_UPLOAD(editing.id), {
          ...(live ? {} : { dept }),
          ...buildBody(),
          // a new file chosen while editing replaces the stored one
          ...(file && stored ? { sourceName: file.name, sourceFile: stored } : {}),
        });
        saved = true;
        if (andPublish) await patch(ADMIN_UPLOAD_STATUS(editing.id), { status: 'published' });
      }
      done(`Saved changes to \u201c${name}\u201d` + (andPublish ? ' and published it.' : '.'));
      refresh();
      refreshAdmin();
    } catch (ex) {
      if (ex && ex.status === 404 && editing.kind === 'upload') {
        // The upload was deleted (here or in another tab). Keep what's in the form as a new upload.
        setEditing(null);
        if (urlParams.get('upload')) setUrlParams({}, { replace: true });
        refresh();
        showSaveErr('This chart was deleted, so the changes could not be saved to it. The form is kept: save it as a new draft or publish it.');
      } else if (saved) {
        // The edit is stored; only publishing failed. It stays a draft, still open here.
        refresh();
        showSaveErr('Your changes were saved, but the chart could not be published: ' + saveError(ex));
      } else showSaveErr('Could not save the changes: ' + saveError(ex));
    } finally {
      setSaving(null);
    }
  };

  // Publish adds it to the chart pool; back to draft takes it out (refused once students submitted it).
  const setStatus = async (d, status) => {
    setErr('');
    try {
      await patch(ADMIN_UPLOAD_STATUS(d.id), { status });
      refreshAdmin();
    } catch (ex) {
      setErr((status === 'published' ? 'Publish' : 'Unpublish') + ' failed: ' + ex.message);
    }
    refresh();
  };
  // Delete asks first (ConfirmDialog); a refusal from the server shows inside the dialog.
  const [toDelete, setToDelete] = useState(null);
  const remove = (d) => {
    setErr('');
    setToDelete(d);
  };
  const deleteNow = (d) => () => del(ADMIN_UPLOAD(d.id));
  const afterDelete = (d) => () => {
    if (d.status === 'published') refreshAdmin();
    // The chart open in the Edit form is gone: leave edit mode, or Save would hit a missing record.
    if (editing && editing.kind === 'upload' && editing.id === d.id) clearForm();
    refresh();
  };

  const lbl = {
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--muted)',
    letterSpacing: '.04em',
    marginBottom: 5,
  };
  const inp = {
    width: '100%',
    padding: '9px 11px',
    border: '1px solid var(--line)',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'inherit',
  };

  return (
    <div ref={topRef}>
      <div className="page-head">
        <h1>{editing ? 'Edit Chart' : 'Upload Charts'}</h1>
        <p>
          {editing
            ? 'Change the record, chart setup or answer key, then save.'
            : 'Upload a de-identified record, review the suggested codes, then publish it to a department.'}
        </p>
      </div>
      {editing && (
        <div className="ue-banner" role="status">
          <i className="bi bi-pencil-square" aria-hidden="true" />
          <div>
            <b>
              {'Editing ' + (editing.kind === 'chart' ? 'chart ' + editing.id : editing.status === 'published' ? 'published upload ' + editing.label : 'draft upload')}
              {title ? ' \u2014 ' + title : ''}
            </b>
            <span>
              {editing.kind === 'chart' || editing.status === 'published'
                ? 'This chart is live. It keeps its ID, department and position, so allocations and earlier scores stay as they are; students who submit after you save are graded against the new answer key.'
                : 'Drafts are not visible to students. Save it as a draft, or save and publish it.'}
            </span>
          </div>
          <button type="button" className="sc-ghost" onClick={clearForm} disabled={!!busy}>
            Cancel editing
          </button>
        </div>
      )}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '18px 20px' }}>
          <div
            style={{
              background: 'var(--tone-fff7ed)',
              border: '1px solid var(--tone-fdba74)',
              borderRadius: 10,
              padding: '10px 13px',
              marginBottom: 16,
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            <b>{'De-identify before uploading. '}</b>Remove patient name, MRN, account number, date
            of birth, address, phone and provider names. Students can see published records.
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ minWidth: 230 }}>
              <div style={lbl}>DEPARTMENT</div>
              <select value={dept} {...flag('dept')} onChange={(ev) => setDept(ev.target.value)} style={inp} disabled={!!editing && (editing.kind === 'chart' || editing.status === 'published')} title={editing && (editing.kind === 'chart' || editing.status === 'published') ? 'A live chart keeps its department' : undefined}>
                {departments.map((dd) => dd.key || dd.id).map((k) => (
                  <option key={k} value={k}>
                    {(deptOf(k) || { name: k }).name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={lbl}>CHART TITLE</div>
              <input
                value={title}
                {...flag('title')}
                maxLength={200}
                onChange={(ev) => setTitle(ev.target.value)}
                placeholder="e.g. Incisional hernia, 6 cm, reducible"
                style={inp}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={lbl}>{editing ? 'REPLACE THE RECORD FROM A FILE (optional)' : 'RECORD FILE (PDF, DOC, DOCX or TXT)'}</div>
            <input
              key={fileKey}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              disabled={!!busy || !!saving}
              onChange={(ev) => {
                const f = ev.target.files && ev.target.files[0];
                if (f) readFile(f);
              }}
              style={{ fontSize: 13 }}
            />
            {stored && (
              <div className="up-file ok">
                {'✓ Stored in S3 · '}
                <a href={stored.url} target="_blank" rel="noopener noreferrer">
                  Open the file
                </a>
              </div>
            )}
            {fileNote && <div className="up-file warn">{fileNote}</div>}
          </div>
          {text && (
            <div style={{ marginBottom: 12 }}>
              <div style={lbl}>EXTRACTED RECORD — edit if needed</div>
              <textarea
                value={text}
                {...flag('record')}
                onChange={(ev) => {
                  setText(ev.target.value);
                  setPhi(scanPHI(ev.target.value));
                }}
                style={{
                  ...inp,
                  minHeight: 150,
                  fontFamily: 'ui-monospace,Menlo,monospace',
                  fontSize: 12,
                }}
              />
            </div>
          )}
          {phi.length > 0 && (
            <div
              style={{
                background: 'var(--tone-fef2f2)',
                border: '1px solid var(--tone-fca5a5)',
                borderRadius: 10,
                padding: '10px 13px',
                marginBottom: 12,
                fontSize: 12.5,
              }}
            >
              <b style={{ color: 'var(--tone-b4232a)' }}>
                Possible identifiers found — remove before publishing:
              </b>
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                {phi.map((p, i) => (
                  <li key={i}>{p.label + ' \u00d7' + p.count + ' (e.g. "' + p.sample + '")'}</li>
                ))}
              </ul>
            </div>
          )}
          {err && (
            <div
              style={{
                background: 'var(--tone-fef2f2)',
                border: '1px solid var(--tone-fca5a5)',
                color: 'var(--tone-b4232a)',
                borderRadius: 10,
                padding: '9px 12px',
                marginBottom: 12,
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              {err}
            </div>
          )}
          {busy && (
            <div
              style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--teal-d)', marginBottom: 12 }}
            >
              {busy}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-teal" disabled={!text || !!busy} onClick={suggest}>
              Suggest codes with Claude
            </button>
            <button
              className="btn"
              style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              disabled={!text || !!busy}
              onClick={addRow}
            >
              Add code manually
            </button>
          </div>
        </div>
      </div>
      {text && <CaseFields value={cs} onChange={setCs} inpatient={inpatient} lists={lists} onError={setErr} errors={badFields} />}
      {/* Shown once there is record text, so Save as draft is reachable before any code is added. */}
      {text && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h">
            <div>
              <h3>{editing ? 'Answer key' : 'Suggested answer key \u2014 review before publishing'}</h3>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                AI-suggested. You are responsible for correctness. Codes are checked against the
                live code database.
              </div>
            </div>
            <button
              className="btn"
              style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              onClick={addRow}
            >
              + Row
            </button>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {!key.length && (
              <div {...flag('key')} tabIndex={-1} style={{ fontSize: 12.5, color: badFields.has('key') ? 'var(--tone-b4232a)' : 'var(--muted)', marginBottom: 12 }}>
                No codes yet. Use <b>Suggest codes with Claude</b> or <b>+ Row</b> to add them. You can save a draft
                now; publishing needs at least one code, with one marked PDx.
              </div>
            )}
            {key.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  marginBottom: 10,
                  flexWrap: 'wrap',
                }}
              >
                <input
                  value={r.code}
                  {...flag(`key.${i}.code`)}
                  onChange={(ev) => setRow(i, 'code', ev.target.value.toUpperCase())}
                  placeholder="CODE"
                  style={{
                    ...inp,
                    width: 110,
                    fontWeight: 800,
                    borderColor:
                      r.valid === false ? 'var(--tone-fca5a5)' : r.valid ? 'var(--tone-86efac)' : 'var(--line)',
                  }}
                />
                <select
                  value={r.type}
                  {...flag(`key.${i}.type`)}
                  onChange={(ev) => setRow(i, 'type', ev.target.value)}
                  style={{ ...inp, width: 96 }}
                >
                  {['PDx', 'SDx', 'Dx', 'CPT', 'HCPCS', 'MOD', 'PCS', ...(inpatient ? ['DRG'] : [])].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  value={r.desc}
                  {...flag(`key.${i}.desc`)}
                  onChange={(ev) => setRow(i, 'desc', ev.target.value)}
                  placeholder="description (required)"
                  style={{ ...inp, flex: 1, minWidth: 180 }}
                />
                <input
                  value={r.why}
                  {...flag(`key.${i}.why`)}
                  onChange={(ev) => setRow(i, 'why', ev.target.value)}
                  placeholder="why this code (required)"
                  style={{ ...inp, flex: 2, minWidth: 220 }}
                />
                {DX_TYPES.includes(r.type) && inpatient && (
                  <select value={r.poa} onChange={(ev) => setRow(i, 'poa', ev.target.value)} style={{ ...inp, width: 104 }} title="POA indicator the student must report">
                    <option value="">POA —</option>
                    {((lists && lists.poa) || []).map((p) => (
                      <option key={p.value} value={p.value} title={p.label}>
                        {'POA ' + p.value}
                      </option>
                    ))}
                  </select>
                )}
                {LINE_TYPES.includes(r.type) && (
                  <>
                    <input value={r.mods} onChange={(ev) => setRow(i, 'mods', ev.target.value.toUpperCase())} placeholder="mods 25,59" title="Modifiers the line must carry. Blank = not graded; '-' = must have none" style={{ ...inp, width: 120 }} />
                    <input value={r.units} onChange={(ev) => setRow(i, 'units', ev.target.value.replace(/\D/g, ''))} placeholder="units" title="Units the line must bill (blank = not graded)" style={{ ...inp, width: 70 }} />
                    <input value={r.ptrs} onChange={(ev) => setRow(i, 'ptrs', ev.target.value.toUpperCase())} placeholder="dx pointers J01.01,J45.20" title="Diagnoses this line points to, first = main reason (blank = not graded)" style={{ ...inp, width: 200 }} />
                  </>
                )}
                <button
                  onClick={() => delRow(i)}
                  style={{
                    border: '1px solid var(--line)',
                    background: 'var(--color-white)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  ×
                </button>
                {r.valid === false && (
                  <div style={{ fontSize: 11, color: 'var(--tone-b4232a)', fontWeight: 700, width: '100%' }}>
                    Not found in the code database
                  </div>
                )}
              </div>
            ))}
            {/* Problems and save errors sit right above the buttons, where the admin is looking. */}
            <div ref={issuesRef} aria-live="polite">
              {issues.length > 0 && (
                <div className="up-issues" role="alert">
                  <b>
                    {(check === 'publish' ? 'Before publishing, fix ' : 'Before saving, fix ') +
                      (issues.length === 1 ? 'this:' : 'these ' + issues.length + ' things:')}
                  </b>
                  <ul>
                    {issues.map((x, i) => (
                      <li key={i}>
                        <button type="button" onClick={() => focusField(x.path)} title="Go to this field">
                          {x.msg}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {saveErr && (
                <div className="up-save-err" role="alert">
                  <i className="bi bi-exclamation-octagon-fill" aria-hidden="true" />
                  <span>{saveErr}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              {editing ? (
                <>
                  <button className="btn btn-teal" disabled={!!busy || !!saving} aria-busy={saving === 'save'} onClick={() => saveEdit(false)}>
                    {saving === 'save' && <span className="btn-spin" aria-hidden="true" />}
                    {saving === 'save' ? 'Saving…' : editing.kind === 'chart' || editing.status === 'published' ? 'Save changes' : 'Save draft'}
                  </button>
                  {editing.kind === 'upload' && editing.status !== 'published' && (
                    <button className="btn" style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }} disabled={!!busy || !!saving} aria-busy={saving === 'savePublish'} onClick={() => saveEdit(true)}>
                      {saving === 'savePublish' && <span className="btn-spin" aria-hidden="true" />}
                      {saving === 'savePublish' ? 'Publishing…' : 'Save & publish'}
                    </button>
                  )}
                  <button className="btn" style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }} disabled={!!busy || !!saving} onClick={clearForm}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-teal" disabled={!!busy || !!saving} aria-busy={saving === 'publish'} onClick={() => publish(false)}>
                    {saving === 'publish' && <span className="btn-spin" aria-hidden="true" />}
                    {saving === 'publish' ? 'Publishing…' : 'Publish to students'}
                  </button>
                  <button
                    className="btn"
                    style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                    disabled={!!busy || !!saving}
                    aria-busy={saving === 'draft'}
                    onClick={() => publish(true)}
                  >
                    {saving === 'draft' && <span className="btn-spin" aria-hidden="true" />}
                    {saving === 'draft' ? 'Saving draft…' : 'Save as draft'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-h">
          <div>
            <h3>Uploaded charts</h3>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Drafts are not visible to students.
            </div>
            <div className="pg-filters" role="tablist" aria-label="Upload status" style={{ marginTop: 8 }}>
              {((uploads.data && uploads.data.filters) || []).map((f) => (
                <button key={f.key} type="button" role="tab" aria-selected={statusTab === f.key} className={statusTab === f.key ? 'on' : ''} onClick={() => setStatusTab(f.key)}>
                  {f.label}
                  <span>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            className="btn"
            style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            onClick={refresh}
          >
            Refresh
          </button>
        </div>
        <div style={{ padding: '12px 16px' }}>
          {loadingDrafts ? (
            <PageLoader variant="inline" label="Loading uploads" />
          ) : drafts.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Nothing uploaded yet.</div>
          ) : (
            drafts.map((d) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: '1px solid var(--line)',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <b style={{ fontSize: 13 }}>{d.title || d.id}</b>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {(d.deptName || d.dept) +
                      ' \u00b7 ' +
                      workTypeInfo(lists, d.workType || 'code').label +
                      ' \u00b7 ' +
                      (d.answerKey || []).length +
                      ' codes' +
                      (d.sourceName ? ' \u00b7 ' + d.sourceName : '')}
                    {d.sourceFile && d.sourceFile.url && (
                      <>
                        {' \u00b7 '}
                        <a href={d.sourceFile.url} target="_blank" rel="noopener noreferrer">
                          Original file
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: 20,
                      background: d.status === 'published' ? 'var(--teal-lt)' : 'var(--tone-f1f5f9)',
                      color: d.status === 'published' ? 'var(--teal-d)' : 'var(--tone-475569)',
                    }}
                  >
                    {(d.status || 'draft').toUpperCase()}
                  </span>
                  <button
                    className="btn"
                    style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 12 }}
                    onClick={() => editUpload(d)}
                    disabled={editing && editing.id === d.id}
                    title="Edit this chart"
                  >
                    <i className="bi bi-pencil" aria-hidden="true" /> {editing && editing.id === d.id ? 'Editing' : 'Edit'}
                  </button>
                  {d.status === 'published' ? (
                    <button
                      className="btn"
                      style={{
                        background: 'var(--color-white)',
                        border: '1px solid var(--line)',
                        color: 'var(--ink)',
                        fontSize: 12,
                      }}
                      onClick={() => setStatus(d, 'draft')}
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      className="btn btn-teal"
                      style={{ fontSize: 12 }}
                      onClick={() => setStatus(d, 'published')}
                    >
                      Publish
                    </button>
                  )}
                  <button
                    style={{
                      border: '1px solid var(--line)',
                      background: 'var(--color-white)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontWeight: 800,
                    }}
                    onClick={() => remove(d)}
                    title="Delete this chart"
                    aria-label="Delete this chart"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
          {uploads.error && (
            <div className="cvx-msg err" role="alert">
              {uploads.error}
            </div>
          )}
          <Pagination {...uploads.pagerProps} itemLabel="uploads" />
        </div>
      </div>
      {toDelete && (
        <ConfirmDialog
          title="Delete this chart?"
          subtitle={toDelete.chart || 'Draft'}
          tone="danger"
          warning={
            <>
              <b>{toDelete.title || toDelete.sourceName || 'This chart'}</b> ({toDelete.deptName || toDelete.dept}) will be deleted
              {toDelete.sourceFile ? ', together with its original file' : ''}.
              {toDelete.status === 'published' && ' It is live: it will be taken out of the chart pool, so students stop getting it.'}
              {' '}This cannot be undone.
              {toDelete.status === 'published' && (
                <>
                  <br />
                  To hide it from students but keep it, use <b>Unpublish</b> instead.
                </>
              )}
            </>
          }
          confirmLabel="Delete chart"
          busyLabel="Deleting…"
          onConfirm={deleteNow(toDelete)}
          onDone={afterDelete(toDelete)}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

// route: /admin/upload
export default function UploadPage() {
  return <AdminUpload />;
}

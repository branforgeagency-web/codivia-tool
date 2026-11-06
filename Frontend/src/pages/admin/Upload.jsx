import { useEffect, useState } from 'react';
import React from 'react';
import { DEPTS } from '../../config/constants.js';
import { activeDeptKeys } from '../../utils/allocation.js';
import { validateCode } from '../../utils/codes.js';
import { extractDocxText, extractPdfText } from '../../utils/extractText.js';
import { scanPHI } from '../../utils/phi.js';

export function AdminUpload() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [dept, setDept] = useState('GENSURG');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [phi, setPhi] = useState([]);
  const [key, setKey] = useState([]); // suggested answer key rows
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLD] = useState(true);

  const refresh = React.useCallback(() => {
    if (!window.CV_FB) {
      setLD(false);
      return;
    }
    setLD(true);
    window.CV_FB.listUploadedCharts()
      .then((l) => {
        setDrafts(l || []);
        setLD(false);
      })
      .catch(() => {
        setDrafts([]);
        setLD(false);
      });
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const readFile = async (f) => {
    setErr('');
    setKey([]);
    setFile(f);
    setBusy('Reading document\u2026');
    try {
      let t = '';
      if (/\.txt$/i.test(f.name)) {
        t = await f.text();
      } else if (/\.pdf$/i.test(f.name)) {
        t = await extractPdfText(f);
      } else if (/\.docx?$/i.test(f.name)) {
        t = await extractDocxText(f);
      } else {
        throw new Error('Unsupported file type. Use PDF, DOC/DOCX or TXT.');
      }
      t = (t || '').replace(/\s+\n/g, '\n').trim();
      if (!t)
        throw new Error(
          'No text could be extracted. If this is a scanned image PDF, paste the text manually below.',
        );
      setText(t);
      setPhi(scanPHI(t));
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    } catch (ex) {
      setErr(ex.message || String(ex));
    }
    setBusy('');
  };

  const suggest = async () => {
    setErr('');
    setBusy('Asking Claude for a suggested answer key\u2026');
    try {
      const d = DEPTS[dept];
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
        code: (c.code || '').trim(),
        type: (c.type || 'PDx').trim(),
        desc: (c.desc || '').trim(),
        why: (c.why || '').trim(),
        valid: validateCode((c.code || '').trim()),
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
        ix === i ? { ...r, [f]: v, valid: f === 'code' ? validateCode(v) : r.valid } : r,
      ),
    );
  const addRow = () =>
    setKey((k) => [...k, { code: '', type: 'SDx', desc: '', why: '', valid: null }]);
  const delRow = (i) => setKey((k) => k.filter((_, ix) => ix !== i));

  const publish = async (asDraft) => {
    setErr('');
    if (!text.trim()) {
      setErr('No record text.');
      return;
    }
    if (!asDraft) {
      if (!key.length) {
        setErr('Add at least one code before publishing.');
        return;
      }
      const bad = key.filter((r) => !r.code || r.valid === false);
      if (bad.length) {
        setErr(
          bad.length +
            ' code(s) are empty or not found in the code database. Fix them before publishing.',
        );
        return;
      }
      const noWhy = key.filter((r) => !r.why.trim());
      if (noWhy.length) {
        setErr('Every code needs a rationale \u2014 ' + noWhy.length + ' missing.');
        return;
      }
      if (!key.some((r) => r.type === 'PDx')) {
        setErr('One code must be marked PDx (principal diagnosis).');
        return;
      }
    }
    setBusy(asDraft ? 'Saving draft\u2026' : 'Publishing\u2026');
    try {
      let up = null;
      if (file) {
        up = await window.CV_FB.uploadChartFile(file);
      }
      const id = 'UP-' + dept + '-' + Date.now();
      await window.CV_FB.saveUploadedChart(id, {
        dept,
        deptName: DEPTS[dept].name,
        title: title || 'Uploaded chart',
        record: text,
        answerKey: key.map((r) => ({ code: r.code, type: r.type, desc: r.desc, why: r.why })),
        patient: { name: 'Uploaded Record', sex: 'F', age: 45 },
        difficulty: 'moderate',
        sourceFile: up ? up.path : null,
        sourceName: up ? up.name : null,
        status: asDraft ? 'draft' : 'published',
      });
      setFile(null);
      setText('');
      setKey([]);
      setTitle('');
      setPhi([]);
      refresh();
    } catch (ex) {
      setErr('Save failed: ' + (ex.message || ex));
    }
    setBusy('');
  };

  const setStatus = async (d, status) => {
    await window.CV_FB.saveUploadedChart(d.id, { status });
    refresh();
  };
  const remove = async (d) => {
    await window.CV_FB.deleteUploadedChart(d.id, d.sourceFile);
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
    <div>
      <div className="page-head">
        <h1>Upload Charts</h1>
        <p>
          Upload a de-identified record, review the suggested codes, then publish it to a
          department.
        </p>
      </div>
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
              <select value={dept} onChange={(ev) => setDept(ev.target.value)} style={inp}>
                {activeDeptKeys().map((k) => (
                  <option key={k} value={k}>
                    {DEPTS[k].name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={lbl}>CHART TITLE</div>
              <input
                value={title}
                onChange={(ev) => setTitle(ev.target.value)}
                placeholder="e.g. Incisional hernia, 6 cm, reducible"
                style={inp}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={lbl}>RECORD FILE (PDF, DOC, DOCX or TXT)</div>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(ev) => {
                const f = ev.target.files && ev.target.files[0];
                if (f) readFile(f);
              }}
              style={{ fontSize: 13 }}
            />
          </div>
          {text && (
            <div style={{ marginBottom: 12 }}>
              <div style={lbl}>EXTRACTED RECORD — edit if needed</div>
              <textarea
                value={text}
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
      {key.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h">
            <div>
              <h3>Suggested answer key — review before publishing</h3>
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
                  onChange={(ev) => setRow(i, 'type', ev.target.value)}
                  style={{ ...inp, width: 96 }}
                >
                  {['PDx', 'SDx', 'CPT', 'HCPCS', 'MOD', 'PCS'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  value={r.desc}
                  onChange={(ev) => setRow(i, 'desc', ev.target.value)}
                  placeholder="description"
                  style={{ ...inp, flex: 1, minWidth: 180 }}
                />
                <input
                  value={r.why}
                  onChange={(ev) => setRow(i, 'why', ev.target.value)}
                  placeholder="why this code (required)"
                  style={{ ...inp, flex: 2, minWidth: 220 }}
                />
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
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-teal" disabled={!!busy} onClick={() => publish(false)}>
                Publish to students
              </button>
              <button
                className="btn"
                style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                disabled={!!busy}
                onClick={() => publish(true)}
              >
                Save as draft
              </button>
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
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
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
                    {(DEPTS[d.dept] ? DEPTS[d.dept].name : d.dept) +
                      ' \u00b7 ' +
                      (d.answerKey || []).length +
                      ' codes' +
                      (d.sourceName ? ' \u00b7 ' + d.sourceName : '')}
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
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// route: /admin/upload
export default function UploadPage() {
  return <AdminUpload />;
}

import { useState } from 'react';
import { _addBtn, _fld, _rowCard, _sectionHead } from './formParts.jsx';
import { _monogram, renderResume } from './layouts.jsx';
import { RESUME_LAYOUTS, RESUME_TEMPLATES, defaultResume } from './templates.js';
import { doPrint } from '../../../utils/print.js';
import { useStudent } from '../../../context/StudentContext.jsx';

export function ResumeView({ stu, stats }) {
  const worked = Object.entries(stats.perDept).filter(([, st]) => st.worked > 0);
  const firstDept = worked[0]?.[0] || Object.keys(stu.depts)[0];
  const [tpl, setTpl] = useState(RESUME_TEMPLATES[0].id);
  const [famFilter, setFamFilter] = useState('all');
  const [showGallery, setShowGallery] = useState(true);
  const [R, setR] = useState(() => defaultResume(stu, stats, firstDept));

  const set = (k, v) => setR((prev) => Object.assign({}, prev, { [k]: v }));
  const setList = (k, i, field, v) =>
    setR((prev) => {
      const a = (prev[k] || []).slice();
      a[i] = Object.assign({}, a[i], { [field]: v });
      return Object.assign({}, prev, { [k]: a });
    });
  const setListBullets = (k, i, v) =>
    setR((prev) => {
      const a = (prev[k] || []).slice();
      a[i] = Object.assign({}, a[i], {
        bullets: v
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      return Object.assign({}, prev, { [k]: a });
    });
  const addRow = (k, blank) =>
    setR((prev) => Object.assign({}, prev, { [k]: (prev[k] || []).concat([blank]) }));
  const rmRow = (k, i) =>
    setR((prev) => {
      const a = (prev[k] || []).slice();
      a.splice(i, 1);
      return Object.assign({}, prev, { [k]: a });
    });
  const setSimpleList = (k, i, v) =>
    setR((prev) => {
      const a = (prev[k] || []).slice();
      a[i] = v;
      return Object.assign({}, prev, { [k]: a });
    });
  const setCSV = (k, v) =>
    set(
      k,
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

  const onPhoto = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => set('photo', rd.result);
    rd.readAsDataURL(f);
  };

  const active = RESUME_TEMPLATES.find((t) => t.id === tpl) || RESUME_TEMPLATES[0];
  const fams = ['all'].concat(RESUME_LAYOUTS.map((l) => l.name));
  const shown = RESUME_TEMPLATES.filter((t) => (famFilter === 'all' ? true : t.fam === famFilter));

  return (
    <div>
      <div className="page-head">
        <h1>Resume Builder</h1>
        <p>
          35 professional resume designs — auto-filled from your CODIVIA work and fully editable.
          Pick a template, fill in your details, then Export PDF.
        </p>
      </div>
      {/* template gallery (collapsible, real mini-previews) */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div
          className="card-h"
          style={{ cursor: 'pointer' }}
          onClick={() => setShowGallery((s) => !s)}
        >
          <h3>Choose a template</h3>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {active.name + ' · ' + shown.length + ' shown · ' + (showGallery ? 'hide ▾' : 'show ▸')}
          </span>
        </div>
        {showGallery ? (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 14px 0' }}>
              {fams.map((f) => (
                <button
                  key={f}
                  onClick={() => setFamFilter(f)}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: 20,
                    cursor: 'pointer',
                    border: '1px solid ' + (famFilter === f ? 'var(--teal)' : 'var(--line)'),
                    background: famFilter === f ? 'var(--teal)' : 'var(--color-white)',
                    color: famFilter === f ? 'var(--color-white)' : 'var(--ink)',
                  }}
                >
                  {f === 'all' ? 'All styles' : f}
                </button>
              ))}
            </div>
            <div
              style={{
                padding: 14,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
                gap: 14,
              }}
            >
              {shown.map((t) => {
                const selected = tpl === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTpl(t.id)}
                    style={{
                      border: selected ? '2px solid ' + t.pal.accent : '1px solid var(--line)',
                      borderRadius: 10,
                      padding: 0,
                      overflow: 'hidden',
                      background: 'var(--color-white)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: selected
                        ? '0 4px 14px ' + t.pal.accent + '33'
                        : '0 1px 3px rgba(0,0,0,.06)',
                    }}
                  >
                    <div
                      style={{
                        height: 186,
                        overflow: 'hidden',
                        background: 'var(--tone-f4f6f8)',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 640,
                          transform: 'scale(0.235)',
                          transformOrigin: 'top left',
                        }}
                      >
                        {renderResume(t.layout, R, t.pal)}
                      </div>
                    </div>
                    <div
                      style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <span
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: 3,
                          background: t.pal.accent,
                          flex: '0 0 auto',
                        }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{t.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      {/* two-pane: editor | live preview */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ---- editor ---- */}
        <div
          className="card"
          style={{
            flex: '1 1 340px',
            minWidth: 300,
            maxWidth: 440,
            padding: 16,
            maxHeight: '82vh',
            overflowY: 'auto',
          }}
        >
          {_sectionHead('Header & contact')}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
            {R.photo ? (
              <img
                src={R.photo}
                style={{ width: 54, height: 54, borderRadius: 8, objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 8,
                  background: active.pal.accent,
                  color: 'var(--color-white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                }}
              >
                {_monogram(R.name)}
              </div>
            )}
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--tone-0b3b36)', cursor: 'pointer' }}>
              Upload photo
              <input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
            </label>
            {R.photo ? (
              <button
                onClick={() => set('photo', '')}
                style={{
                  fontSize: 11,
                  color: 'var(--tone-c0392b)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                remove
              </button>
            ) : null}
          </div>
          {_fld('Full name', R.name, (v) => set('name', v))}
          {_fld('Title line', R.role, (v) => set('role', v), {
            ph: 'CERTIFIED MEDICAL CODER | FRESHER',
          })}
          {_fld('Location', R.location, (v) => set('location', v))}
          {_fld('Phone', R.phone, (v) => set('phone', v), { ph: '+91 ...' })}
          {_fld('Email', R.email, (v) => set('email', v))}
          {_fld('LinkedIn URL', R.linkedin, (v) => set('linkedin', v))}
          {_sectionHead('Professional summary')}
          {_fld('Summary', R.summary, (v) => set('summary', v), { area: true, rows: 5 })}
          {_sectionHead('Highlight boxes (3)')}
          {(R.stats3 || []).map((x, i) =>
            _rowCard(
              [
                _fld('Big text', x.big, (v) => setList('stats3', i, 'big', v)),
                _fld('Small text', x.small, (v) => setList('stats3', i, 'small', v)),
              ],
              () => rmRow('stats3', i),
            ),
          )}
          {(R.stats3 || []).length < 3
            ? _addBtn('Add box', () => addRow('stats3', { big: '', small: '' }))
            : null}
          {_sectionHead('Practical experience')}
          {(R.experience || []).map((x, i) =>
            _rowCard(
              [
                _fld('Role / title', x.role, (v) => setList('experience', i, 'role', v)),
                _fld('Period / detail', x.period, (v) => setList('experience', i, 'period', v)),
                _fld(
                  'Bullets (one per line)',
                  (x.bullets || []).join('\n'),
                  (v) => setListBullets('experience', i, v),
                  { area: true, rows: 6 },
                ),
              ],
              () => rmRow('experience', i),
            ),
          )}
          {_addBtn('Add experience', () =>
            addRow('experience', { role: '', period: '', bullets: [] }),
          )}
          {_sectionHead('Certification')}
          {(R.certifications || []).map((x, i) =>
            _rowCard(
              [
                _fld('Certification', x.name, (v) => setList('certifications', i, 'name', v)),
                _fld('Certifying body', x.by, (v) => setList('certifications', i, 'by', v)),
                _fld('Credential ID', x.id, (v) => setList('certifications', i, 'id', v)),
                _fld('Valid through', x.valid, (v) => setList('certifications', i, 'valid', v)),
              ],
              () => rmRow('certifications', i),
            ),
          )}
          {_addBtn('Add certification', () =>
            addRow('certifications', { name: '', by: '', id: '', valid: '' }),
          )}
          {_sectionHead('Education')}
          {(R.education || []).map((x, i) =>
            _rowCard(
              [
                _fld('Degree / diploma', x.degree, (v) => setList('education', i, 'degree', v)),
                _fld('College / university, city', x.school, (v) =>
                  setList('education', i, 'school', v),
                ),
                _fld('Year', x.period, (v) => setList('education', i, 'period', v)),
                _fld('Percentage / CGPA', x.detail, (v) => setList('education', i, 'detail', v)),
              ],
              () => rmRow('education', i),
            ),
          )}
          {_addBtn('Add education', () =>
            addRow('education', { degree: '', school: '', period: '', detail: '' }),
          )}
          {_sectionHead('Project / internship (optional)')}
          {(R.projects || []).map((x, i) =>
            _rowCard(
              [
                _fld('Project / internship', x, (v) => setSimpleList('projects', i, v), {
                  area: true,
                  rows: 2,
                }),
              ],
              () => rmRow('projects', i),
            ),
          )}
          {_addBtn('Add project', () => addRow('projects', ''))}
          {_sectionHead('Right column lists')}
          {_fld(
            'Core coding skills (comma separated)',
            (R.coreSkills || []).join(', '),
            (v) => setCSV('coreSkills', v),
            { area: true, rows: 2 },
          )}
          {_fld(
            'Clinical knowledge (comma separated)',
            (R.clinical || []).join(', '),
            (v) => setCSV('clinical', v),
            { area: true, rows: 2 },
          )}
          {_fld('Tools (comma separated)', (R.tools || []).join(', '), (v) => setCSV('tools', v), {
            area: true,
            rows: 2,
          })}
          {_fld(
            'Professional strengths (comma separated)',
            (R.strengths || []).join(', '),
            (v) => setCSV('strengths', v),
            { area: true, rows: 2 },
          )}
          {_fld('Languages (comma separated)', (R.languages || []).join(', '), (v) =>
            setCSV('languages', v),
          )}
        </div>
        {/* ---- live preview ---- */}
        <div style={{ flex: '2 1 460px', minWidth: 320 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Live preview</span>
            <button className="btn btn-teal" style={{ marginLeft: 'auto' }} onClick={doPrint}>
              ⬇ Export PDF
            </button>
          </div>
          <div className="print-area" style={{ maxWidth: 800 }}>
            {renderResume(active.layout, R, active.pal)}
          </div>
        </div>
      </div>
    </div>
  );
}

// route: /resume
export default function ResumeBuilderPage() {
  const { stu, stats } = useStudent();
  return <ResumeView stu={stu} stats={stats} />;
}

import { useState } from 'react';
import { AddButton, BulletList, Field, ItemCard, Section, TagInput } from './formParts.jsx';
import { _monogram, renderResume } from './layouts.jsx';
import { RESUME_LAYOUTS, RESUME_TEMPLATES, defaultResume } from './templates.js';
import { doPrint } from '../../../utils/print.js';
import { useStudent } from '../../../context/StudentContext.jsx';

// ---- Resume Builder. Styles: .rb-* in styles/refinements.css ----
// A template is a layout × a colour palette (id "<layout>-<palette>"), see templates.js.

const PALETTES = RESUME_TEMPLATES.reduce((out, t) => (out.some((p) => p.key === t.pal.key) ? out : out.concat(t.pal)), []);
const findTemplate = (layout, pal) => RESUME_TEMPLATES.find((t) => t.layout === layout && t.pal.key === pal) || RESUME_TEMPLATES[0];

const LAYOUT_ICONS = {
  'header-band': 'bi-window',
  'left-rail': 'bi-layout-sidebar',
  'right-rail': 'bi-layout-sidebar-reverse',
  'top-banner': 'bi-person-square',
  minimal: 'bi-file-text',
  timeline: 'bi-bar-chart-steps',
  compact: 'bi-grid-1x2',
  classic: 'bi-type',
  executive: 'bi-briefcase',
  'split-header': 'bi-layout-split',
  'soft-sidebar': 'bi-layout-text-sidebar',
  'modern-cards': 'bi-card-heading',
};

const SECTION_KEYS = ['header', 'summary', 'highlights', 'experience', 'certifications', 'education', 'projects', 'skills'];

const filled = (v) => Boolean(v && String(v).trim());
const words = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');

// Small static preview of a template, used in the template picker.
function Thumb({ layout, pal, R, width }) {
  return (
    <div className="rb-thumb" style={{ width, height: Math.round(width * 1.3) }}>
      <div style={{ width: 640, transform: `scale(${width / 640})` }}>{renderResume(layout, R, pal)}</div>
    </div>
  );
}

export function ResumeView({ stu, stats }) {
  const worked = Object.entries(stats.perDept).filter(([, st]) => st.worked > 0);
  const firstDept = worked[0]?.[0] || Object.keys(stu.depts)[0];
  const initial = () => defaultResume(stu, stats, firstDept);

  const [tpl, setTpl] = useState(RESUME_TEMPLATES[0].id);
  const [picker, setPicker] = useState(false);
  const [open, setOpen] = useState({ header: true });
  const [R, setR] = useState(initial);

  const active = RESUME_TEMPLATES.find((t) => t.id === tpl) || RESUME_TEMPLATES[0];
  const activeLayout = RESUME_LAYOUTS.find((l) => l.key === active.layout) || RESUME_LAYOUTS[0];

  // ---- state helpers (the resume object keeps the same shape the layouts read) ----
  const set = (k, v) => setR((prev) => ({ ...prev, [k]: v }));
  const setItem = (k, i, field, v) =>
    setR((prev) => ({ ...prev, [k]: (prev[k] || []).map((x, j) => (j === i ? (field ? { ...x, [field]: v } : v) : x)) }));
  const addItem = (k, blank) => setR((prev) => ({ ...prev, [k]: (prev[k] || []).concat([blank]) }));
  const removeItem = (k, i) => setR((prev) => ({ ...prev, [k]: (prev[k] || []).filter((_, j) => j !== i) }));
  const moveItem = (k, i, dir) =>
    setR((prev) => {
      const a = (prev[k] || []).slice();
      const j = i + dir;
      if (j < 0 || j >= a.length) return prev;
      [a[i], a[j]] = [a[j], a[i]];
      return { ...prev, [k]: a };
    });

  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));
  const allOpen = SECTION_KEYS.every((k) => open[k]);
  const setAll = (v) => setOpen(Object.fromEntries(SECTION_KEYS.map((k) => [k, v])));
  const sec = (key) => ({ open: Boolean(open[key]), onToggle: () => toggle(key) });

  const onPhoto = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    // Shrink to at most 480 px (JPEG) so the photo stays small enough to save with the resume.
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 480 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        set('photo', c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => window.alert('That file could not be read as an image.');
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  };

  const reset = () => {
    if (window.confirm('Reset every field to the auto-filled CODIVIA details? Your edits will be lost.')) setR(initial());
  };

  const list = (k) => R[k] || [];
  const contactFilled = ['name', 'role', 'location', 'phone', 'email', 'linkedin'].filter((k) => filled(R[k])).length;
  const skillCount = ['coreSkills', 'clinical', 'tools', 'strengths', 'languages'].reduce((n, k) => n + list(k).length, 0);

  return (
    <div className="rb">
      {/* ---- hero ---- */}
      <header className="rb-hero">
        <div className="rb-hero-main">
          <span className="rb-hero-ico">
            <i className="bi bi-file-earmark-person" aria-hidden="true" />
          </span>
          <div>
            <h1>Resume Builder</h1>
            <p>
              Auto-filled from your CODIVIA coding work. Pick a design, edit any section, and export a print-ready
              PDF.
            </p>
          </div>
        </div>
        <div className="rb-hero-acts">
          <button type="button" className="rb-btn ghost" onClick={reset}>
            <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Reset
          </button>
          <button type="button" className="rb-btn primary" onClick={doPrint}>
            <i className="bi bi-download" aria-hidden="true" /> Export PDF
          </button>
        </div>
      </header>

      {/* ---- template bar + picker ---- */}
      <div className="rb-tpl">
        <div className="rb-tpl-bar">
          <Thumb layout={active.layout} pal={active.pal} R={R} width={54} />
          <div className="rb-tpl-info">
            <span className="k">Template</span>
            <strong>{activeLayout.name}</strong>
            <span className="s">{activeLayout.desc}</span>
          </div>
          <div className="rb-swatches" role="radiogroup" aria-label="Colour">
            {PALETTES.map((p) => (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={active.pal.key === p.key}
                title={p.name}
                aria-label={p.name}
                className={'rb-swatch' + (active.pal.key === p.key ? ' on' : '')}
                style={{ '--sw': p.accent }}
                onClick={() => setTpl(findTemplate(active.layout, p.key).id)}
              />
            ))}
          </div>
          <button type="button" className={'rb-btn soft' + (picker ? ' on' : '')} onClick={() => setPicker((v) => !v)} aria-expanded={picker}>
            <i className="bi bi-grid-3x3-gap" aria-hidden="true" /> {picker ? 'Close layouts' : 'Change layout'}
          </button>
        </div>
        {picker ? (
          <div className="rb-layouts">
            {RESUME_LAYOUTS.map((l) => {
              const on = l.key === active.layout;
              return (
                <button
                  key={l.key}
                  type="button"
                  className={'rb-layout' + (on ? ' on' : '')}
                  style={{ '--acc': active.pal.accent }}
                  onClick={() => setTpl(findTemplate(l.key, active.pal.key).id)}
                  aria-pressed={on}
                >
                  <Thumb layout={l.key} pal={active.pal} R={R} width={168} />
                  <span className="rb-layout-name">
                    <i className={'bi ' + (LAYOUT_ICONS[l.key] || 'bi-file-earmark')} aria-hidden="true" />
                    {l.name}
                    {on ? <i className="bi bi-check-circle-fill rb-layout-check" aria-hidden="true" /> : null}
                  </span>
                  <span className="rb-layout-desc">{l.desc}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="rb-body">
        {/* ---- editor ---- */}
        <div className="rb-editor">
          <div className="rb-editor-head">
            <span className="rb-editor-title">
              <i className="bi bi-pencil-square" aria-hidden="true" /> Edit details
            </span>
            <button type="button" className="rb-link" onClick={() => setAll(!allOpen)}>
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          <Section icon="bi-person-vcard" title="Header & contact" meta={contactFilled + '/6 filled'} {...sec('header')}>
            <div className="rb-photo">
              {R.photo ? (
                <img src={R.photo} alt="" />
              ) : (
                <span className="rb-avatar" style={{ background: active.pal.accent }}>
                  {_monogram(R.name)}
                </span>
              )}
              <div>
                <label className="rb-btn soft sm">
                  <i className="bi bi-camera" aria-hidden="true" /> {R.photo ? 'Change photo' : 'Upload photo'}
                  <input type="file" accept="image/*" onChange={onPhoto} hidden />
                </label>
                {R.photo ? (
                  <button type="button" className="rb-link danger" onClick={() => set('photo', '')}>
                    Remove
                  </button>
                ) : (
                  <small className="rb-hint">Optional. Shown on photo layouts.</small>
                )}
              </div>
            </div>
            <Field label="Full name" value={R.name} onChange={(v) => set('name', v)} />
            <Field label="Title line" value={R.role} onChange={(v) => set('role', v)} placeholder="CERTIFIED MEDICAL CODER | FRESHER" />
            <div className="rb-grid2">
              <Field label="Phone" type="tel" value={R.phone} onChange={(v) => set('phone', v)} placeholder="+91 …" />
              <Field label="Email" type="email" value={R.email} onChange={(v) => set('email', v)} placeholder="you@example.com" />
            </div>
            <div className="rb-grid2">
              <Field label="Location" value={R.location} onChange={(v) => set('location', v)} />
              <Field label="LinkedIn URL" value={R.linkedin} onChange={(v) => set('linkedin', v)} placeholder="linkedin.com/in/…" />
            </div>
          </Section>

          <Section icon="bi-text-paragraph" title="Professional summary" meta={plural(words(R.summary), 'word')} {...sec('summary')}>
            <Field
              label="Summary"
              area
              rows={7}
              max={700}
              value={R.summary}
              onChange={(v) => set('summary', v)}
              hint="3–5 sentences: who you are, what you have practised, and the role you want."
            />
          </Section>

          <Section icon="bi-stars" title="Highlight boxes" meta={list('stats3').length + '/3'} {...sec('highlights')}>
            {list('stats3').map((x, i) => (
              <ItemCard
                key={i}
                index={i}
                count={list('stats3').length}
                label={x.big || 'Highlight'}
                onMove={(d) => moveItem('stats3', i, d)}
                onRemove={() => removeItem('stats3', i)}
              >
                <div className="rb-grid2">
                  <Field label="Big text" value={x.big} onChange={(v) => setItem('stats3', i, 'big', v)} />
                  <Field label="Small text" value={x.small} onChange={(v) => setItem('stats3', i, 'small', v)} />
                </div>
              </ItemCard>
            ))}
            {list('stats3').length < 3 ? <AddButton label="Add highlight" onClick={() => addItem('stats3', { big: '', small: '' })} /> : null}
          </Section>

          <Section icon="bi-briefcase" title="Practical experience" meta={plural(list('experience').length, 'entry', 'entries')} {...sec('experience')}>
            {list('experience').map((x, i) => (
              <ItemCard
                key={i}
                index={i}
                count={list('experience').length}
                label={x.role || 'New experience'}
                onMove={(d) => moveItem('experience', i, d)}
                onRemove={() => removeItem('experience', i)}
              >
                <Field label="Role / title" value={x.role} onChange={(v) => setItem('experience', i, 'role', v)} />
                <Field label="Period / detail" value={x.period} onChange={(v) => setItem('experience', i, 'period', v)} placeholder="2026 | 120 charts completed" />
                <div className="rb-field">
                  <div className="rb-field-top">
                    <label>Key points</label>
                    <span className="rb-count">{(x.bullets || []).filter(filled).length}</span>
                  </div>
                  <BulletList
                    items={x.bullets}
                    onChange={(v) => setItem('experience', i, 'bullets', v)}
                    placeholder="Start with an action verb: Coded, Reviewed, Applied…"
                  />
                </div>
              </ItemCard>
            ))}
            <AddButton label="Add experience" onClick={() => addItem('experience', { role: '', period: '', bullets: [''] })} />
          </Section>

          <Section icon="bi-patch-check" title="Certifications" meta={plural(list('certifications').length, 'entry', 'entries')} {...sec('certifications')}>
            {list('certifications').map((x, i) => (
              <ItemCard
                key={i}
                index={i}
                count={list('certifications').length}
                label={x.name || 'New certification'}
                onMove={(d) => moveItem('certifications', i, d)}
                onRemove={() => removeItem('certifications', i)}
              >
                <Field label="Certification" value={x.name} onChange={(v) => setItem('certifications', i, 'name', v)} />
                <Field label="Certifying body" value={x.by} onChange={(v) => setItem('certifications', i, 'by', v)} />
                <div className="rb-grid2">
                  <Field label="Credential ID" value={x.id} onChange={(v) => setItem('certifications', i, 'id', v)} />
                  <Field label="Valid through" value={x.valid} onChange={(v) => setItem('certifications', i, 'valid', v)} />
                </div>
              </ItemCard>
            ))}
            <AddButton label="Add certification" onClick={() => addItem('certifications', { name: '', by: '', id: '', valid: '' })} />
          </Section>

          <Section icon="bi-mortarboard" title="Education" meta={plural(list('education').length, 'entry', 'entries')} {...sec('education')}>
            {list('education').map((x, i) => (
              <ItemCard
                key={i}
                index={i}
                count={list('education').length}
                label={x.degree || 'New education'}
                onMove={(d) => moveItem('education', i, d)}
                onRemove={() => removeItem('education', i)}
              >
                <Field label="Degree / diploma" value={x.degree} onChange={(v) => setItem('education', i, 'degree', v)} />
                <Field label="College / university, city" value={x.school} onChange={(v) => setItem('education', i, 'school', v)} />
                <div className="rb-grid2">
                  <Field label="Year" value={x.period} onChange={(v) => setItem('education', i, 'period', v)} />
                  <Field label="Percentage / CGPA" value={x.detail} onChange={(v) => setItem('education', i, 'detail', v)} />
                </div>
              </ItemCard>
            ))}
            <AddButton label="Add education" onClick={() => addItem('education', { degree: '', school: '', period: '', detail: '' })} />
          </Section>

          <Section icon="bi-kanban" title="Projects / internships" meta={list('projects').filter(filled).length ? plural(list('projects').filter(filled).length, 'entry', 'entries') : 'Optional'} {...sec('projects')}>
            {list('projects').map((x, i) => (
              <ItemCard
                key={i}
                index={i}
                count={list('projects').length}
                label={x ? x.slice(0, 48) : 'New project'}
                onMove={(d) => moveItem('projects', i, d)}
                onRemove={() => removeItem('projects', i)}
              >
                <Field label="Project / internship" area rows={2} value={x} onChange={(v) => setItem('projects', i, null, v)} />
              </ItemCard>
            ))}
            <AddButton label="Add project" onClick={() => addItem('projects', '')} />
          </Section>

          <Section icon="bi-tools" title="Skills & languages" meta={plural(skillCount, 'item')} {...sec('skills')}>
            <TagInput label="Core coding skills" items={R.coreSkills} onChange={(v) => set('coreSkills', v)} placeholder="e.g. ICD-10-CM Coding" />
            <TagInput label="Clinical knowledge" items={R.clinical} onChange={(v) => set('clinical', v)} placeholder="e.g. Medical Terminology" />
            <TagInput label="Tools" items={R.tools} onChange={(v) => set('tools', v)} placeholder="e.g. Encoder software" />
            <TagInput label="Professional strengths" items={R.strengths} onChange={(v) => set('strengths', v)} placeholder="e.g. Attention to Detail" />
            <TagInput label="Languages" items={R.languages} onChange={(v) => set('languages', v)} placeholder="e.g. English — Professional" />
            <small className="rb-hint">Press Enter or comma to add. Backspace removes the last one.</small>
          </Section>
        </div>

        {/* ---- live preview ---- */}
        <div className="rb-preview">
          <div className="rb-preview-bar">
            <span className="rb-live">
              <span className="pulse" aria-hidden="true" /> Live preview
            </span>
            <span className="rb-preview-name">
              <span className="dot" style={{ background: active.pal.accent }} />
              {active.name}
            </span>
          </div>
          <div className="rb-canvas">
            <div className="print-area rb-paper">{renderResume(active.layout, R, active.pal)}</div>
          </div>
          <p className="rb-tip">
            <i className="bi bi-info-circle" aria-hidden="true" /> In the print dialog choose <b>Save as PDF</b>, turn on{' '}
            <b>Background graphics</b> and turn off headers &amp; footers.
          </p>
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

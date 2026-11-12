
// ---- Resume view (template gallery + auto-filled preview) ----
// ---- Résumé design system: palettes × layout engines = 30+ distinct templates ----
// ---- Résumé design system: one professional "Medical Coding Fresher" layout × color palettes ----
export const RESUME_PALETTES = [
  {
    key: 'teal',
    name: 'Teal',
    accent: 'var(--tone-00a88e)',
    deep: 'var(--tone-0b3b36)',
    tint: 'var(--tone-e7f6f3)',
    ink: 'var(--tone-0b1d3a)',
  },
  {
    key: 'navy',
    name: 'Navy',
    accent: 'var(--tone-12395f)',
    deep: 'var(--tone-0b1d3a)',
    tint: 'var(--tone-eaf0f6)',
    ink: 'var(--tone-0b1d3a)',
  },
  {
    key: 'gold',
    name: 'Gold',
    accent: 'var(--tone-c6902a)',
    deep: 'var(--tone-5a4410)',
    tint: 'var(--tone-fbf3df)',
    ink: 'var(--tone-2a2410)',
  },
  {
    key: 'coral',
    name: 'Coral',
    accent: 'var(--tone-d85a30)',
    deep: 'var(--tone-7a2e14)',
    tint: 'var(--tone-fcebe3)',
    ink: 'var(--tone-2a1710)',
  },
  {
    key: 'forest',
    name: 'Forest',
    accent: 'var(--tone-2e7d4f)',
    deep: 'var(--tone-123b24)',
    tint: 'var(--tone-e7f4ec)',
    ink: 'var(--tone-10231a)',
  },
  {
    key: 'plum',
    name: 'Plum',
    accent: 'var(--tone-7a3b7a)',
    deep: 'var(--tone-3d1d3d)',
    tint: 'var(--tone-f4e9f4)',
    ink: 'var(--tone-241024)',
  },
  {
    key: 'slate',
    name: 'Slate',
    accent: 'var(--tone-475569)',
    deep: 'var(--tone-1f2937)',
    tint: 'var(--tone-eef1f5)',
    ink: 'var(--tone-1f2937)',
  },
  {
    key: 'crimson',
    name: 'Crimson',
    accent: 'var(--tone-b0273c)',
    deep: 'var(--tone-5c0f1c)',
    tint: 'var(--tone-fbe7eb)',
    ink: 'var(--tone-2a0a10)',
  },
  {
    key: 'indigo',
    name: 'Indigo',
    accent: 'var(--tone-4f46b8)',
    deep: 'var(--tone-241f6b)',
    tint: 'var(--tone-ecebfa)',
    ink: 'var(--tone-1a1640)',
  },
];

// Color-only templates (one shared fresher structure)
// 12 structural layouts × 5 palettes = 60 distinct résumé templates (layouts.jsx renders each layout)
export const RESUME_LAYOUTS = [
  { key: 'header-band', name: 'Header Band', desc: 'Bold colour header, 2-col body' },
  { key: 'left-rail', name: 'Left Rail', desc: 'Dark sidebar left, content right' },
  { key: 'right-rail', name: 'Right Rail', desc: 'Content left, dark sidebar right' },
  { key: 'top-banner', name: 'Photo Banner', desc: 'Centered photo banner, single col' },
  { key: 'minimal', name: 'Minimal ATS', desc: 'Clean single column, ATS-friendly' },
  { key: 'timeline', name: 'Timeline', desc: 'Accent timeline down the experience' },
  { key: 'compact', name: 'Compact Grid', desc: 'Tight two-column card grid' },
  { key: 'classic', name: 'Classic Serif', desc: 'Traditional serif, centred, ATS-friendly' },
  { key: 'executive', name: 'Executive', desc: 'Strong name block, side highlights' },
  { key: 'split-header', name: 'Split Header', desc: 'Colour + contact header, 1-col body' },
  { key: 'soft-sidebar', name: 'Soft Sidebar', desc: 'Light sidebar with skill chips' },
  { key: 'modern-cards', name: 'Modern Cards', desc: 'Each section in its own card' },
];

export const RESUME_TEMPLATES = (function () {
  const pals = RESUME_PALETTES.slice(0, 5); // 5 palettes × 12 layouts = 60
  const out = [];
  RESUME_LAYOUTS.forEach(function (L) {
    pals.forEach(function (P) {
      out.push({
        id: L.key + '-' + P.key,
        name: P.name + ' ' + L.name,
        layout: L.key,
        pal: P,
        fam: L.name,
      });
    });
  });
  return out;
})();

// Default résumé content — seeded from the student + their CODIVIA coding record
// departments: { KEY: { name, elements } } from GET /departments (useDepartments()).
export function defaultResume(stu, stats, target, departments = {}) {
  const d = departments[target] || { name: 'Emergency Department', elements: [] };
  const st = stats.perDept[target] || { worked: 0, avg: 0 };
  const certId = 'CDV-2026-' + String(1000 + parseInt(stu.id.replace(/\D/g, ''))).padStart(6, '0');
  const worked = st.worked || 0;
  const deptShort = (d.name || 'Emergency Department')
    .replace(' — Professional', '')
    .replace(' — Facility', '');
  const shortTag = deptShort === 'Emergency Department' ? 'ED' : deptShort.toUpperCase();
  return {
    name: stu.name,
    role: 'CERTIFIED MEDICAL CODER | FRESHER',
    phone: '',
    email: '',
    location: 'Coimbatore, Tamil Nadu',
    linkedin: '',
    photo: '',
    summary:
      'Certified medical coding fresher with hands-on ' +
      deptShort.toLowerCase() +
      ' coding practice using CODIVIA coding software. Completed ' +
      worked +
      ' ' +
      deptShort +
      ' charts with exposure to diagnosis and procedure code assignment, documentation review, guideline application, and code validation. Strong foundation in anatomy, medical terminology, ICD-10-CM, CPT, HCPCS Level II, and healthcare compliance. Seeking an entry-level medical coding opportunity to contribute accuracy, productivity, and continuous learning.',
    stats3: [
      { big: worked + ' ' + shortTag + ' CHARTS', small: 'Practical coding completed' },
      { big: 'CERTIFIED', small: 'CPC (in progress)' },
      { big: 'CODIVIA', small: 'Coding software exposure' },
    ],
    experience: [
      {
        role: deptShort + ' Coding Practice — CODIVIA Coding Software',
        period: '2026 | ' + worked + ' ' + shortTag + ' Charts Completed',
        bullets: [
          'Reviewed and coded ' +
            worked +
            ' simulated ' +
            deptShort.toLowerCase() +
            ' charts in CODIVIA, applying ICD-10-CM, CPT, and HCPCS Level II concepts.',
          'Identified principal diagnoses, secondary conditions, symptoms, procedures, injections, and supplies from clinical documentation.',
          'Applied official coding guidelines, sequencing rules, inclusion/exclusion notes, and documentation-specific code selection.',
          'Practised evaluation and management concepts, medical necessity review, and accurate capture of comorbidities.',
          'Used coding feedback and validation results to improve accuracy, speed, and rationale-based code selection.',
          'Maintained confidentiality and followed HIPAA-aware handling principles during simulated chart practice.',
        ],
      },
    ],
    certifications: [{ name: 'CPC (Certified Professional Coder)', by: 'AAPC', id: '', valid: '' }],
    education: [
      {
        degree: 'Degree / Diploma',
        school: 'College / University, City',
        period: 'Year',
        detail: 'Percentage / CGPA',
      },
    ],
    projects: [''],
    coreSkills: [
      'ICD-10-CM Coding',
      'CPT Coding',
      'HCPCS Level II',
      'ED Chart Coding',
      'Diagnosis Sequencing',
      'E/M Fundamentals',
      'Medical Necessity',
      'Code Validation',
    ],
    clinical: [
      'Anatomy & Physiology',
      'Medical Terminology',
      'Pathophysiology',
      'Pharmacology Basics',
      'Disease Processes',
      'Clinical Documentation',
    ],
    tools: [
      'CODIVIA Coding Software',
      'Encoder / Code Book Navigation',
      'Microsoft Word & Excel',
      'Healthcare Documentation Review',
    ],
    strengths: [
      'Attention to Detail',
      'Analytical Thinking',
      'Accuracy & Quality Focus',
      'Time Management',
      'Quick Learning',
      'Team Collaboration',
    ],
    languages: ['English — Professional', 'Tamil — Native'],
  };
}

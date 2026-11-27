/* CODIVIA EHR shell — chart text helpers shared by the shell, activities and sidebar.
   Pure functions (no React): names, the visit's record sections, vitals, medications, dates. */

// "Doe, Jane" → "JD"; "Dr Kim Patel, MD" → "KP".
export const initials = (name) =>
  String(name || '?')
    .replace(/^dr\.?\s*/i, '')
    .split(/[,\s]+/)
    .filter((w) => w && !/^(md|do|np|pa|rn|dds|phd)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

// Patient names are stored "Last, First": initials and display read them first-name first.
export const patientInitials = (name) =>
  initials(
    String(name || '')
      .split(',')
      .map((s) => s.trim())
      .reverse()
      .join(' '),
  );
export const displayName = (name) => {
  const [last, first] = String(name || '')
    .split(',')
    .map((s) => s.trim());
  return first ? `${first} ${last}` : last || 'Patient';
};

export const sexLabel = (sex) => (sex === 'F' ? 'Female' : sex === 'M' ? 'Male' : sex || '');
export const isAlertAllergy = (allergy) => !!allergy && !/^nkda|^no known/i.test(allergy);
export const hasValue = (v) => v !== undefined && v !== null && v !== '';

// The visit's record sections: the full record (plain charts) or every document except query answers.
export const visitSections = (docs) =>
  (
    docs.find((d) => d.key === 'full') || {
      sections: docs.filter((d) => !d.isQuery).flatMap((d) => d.sections),
    }
  ).sections;
export const sectionsText = (sections) =>
  sections.map((s) => s.head + '\n' + (s.body || '')).join('\n');
export const sectionsMatching = (sections, re) => sections.filter((s) => re.test(s.head));

// "Sunday, June 29, 2025, 10:11 AM" — the sidebar's "Current as of" line.
export const asOf = (d) =>
  d.toLocaleString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

// Vital signs written in the record ("Blood pressure: 124/78 mmHg. Heart rate: 76 …").
const VITALS = [
  ['bp', 'BP', /(?:blood pressure|\bBP)\s*[:-]?\s*(\d{2,3}\s*\/\s*\d{2,3})/i, 'mmHg'],
  ['hr', 'Pulse', /(?:heart rate|pulse|\bHR)\s*[:-]?\s*(\d{2,3})/i, 'bpm'],
  ['rr', 'Resp', /(?:respiratory rate|\bRR)\s*[:-]?\s*(\d{1,2})/i, '/min'],
  [
    'temp',
    'Temp',
    /(?:temperature|\btemp)\s*[:-]?\s*(\d{2,3}(?:\.\d)?)\s*(?:degrees\s*)?([FC])?/i,
    '',
  ],
  ['spo2', 'SpO2', /(?:spo2|o2 sat\w*|oxygen saturation)\s*[:-]?\s*(\d{2,3})\s*%/i, '%'],
  ['wt', 'Weight', /(?:weight|\bwt)\s*[:-]?\s*(\d{2,3}(?:\.\d+)?\s*(?:kg|lbs?))/i, ''],
  ['ht', 'Height', /(?:height|\bht)\s*[:-]?\s*(\d[\d.]*\s*(?:cm|in|m)\b)/i, ''],
  ['bmi', 'BMI', /BMI\s*[:-]?\s*(\d{2}(?:\.\d+)?)/i, 'kg/m²'],
];
export const VITAL_LIST = VITALS.map(([key, label, , unit]) => ({ key, label, unit }));
export function vitalsOf(text) {
  const out = {};
  VITALS.forEach(([k, , re]) => {
    const m = String(text || '').match(re);
    if (m)
      out[k] =
        m[1].replace(/\s+/g, ' ').trim() + (k === 'temp' && m[2] ? ' °' + m[2].toUpperCase() : '');
  });
  return out;
}
// Medication lines of the record's medication sections.
export function medsOf(sections) {
  return sections
    .filter((s) => /MEDICATION/i.test(s.head) && !/ALLERG/i.test(s.head))
    .flatMap((s) => String(s.body || '').split(/\n|(?<=\.)\s+(?=[A-Z])/))
    .map((l) => l.trim().replace(/\.$/, ''))
    .filter((l) => l && !/^(none|no current|nkda)/i.test(l));
}

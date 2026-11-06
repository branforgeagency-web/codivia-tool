// ============ CHART UPLOAD (admin) ============
// Team uploads a DE-IDENTIFIED record (pdf/doc/docx/txt). We extract the text,
// ask Claude for a suggested answer key, then the admin REVIEWS and edits before
// publishing. Nothing reaches students until status==='published'.
export const PHI_PATTERNS = [
  { re: /\b\d{3}-\d{2}-\d{4}\b/g, label: 'SSN' },
  { re: /\bMRN[:\s#]*[A-Z0-9-]{4,}\b/gi, label: 'MRN' },
  { re: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, label: 'date of birth / exact date' },
  { re: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, label: 'email address' },
  { re: /\b(?:\+?\d{1,3}[\s-]?)?\d{10}\b/g, label: 'phone number' },
  { re: /\bDr\.?\s+[A-Z][a-z]+/g, label: 'provider name' },
];

export function scanPHI(text) {
  const hits = [];
  PHI_PATTERNS.forEach((p) => {
    const m = (text || '').match(p.re);
    if (m && m.length) hits.push({ label: p.label, count: m.length, sample: m[0] });
  });
  return hits;
}

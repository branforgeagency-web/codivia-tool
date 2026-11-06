// ---- CODIVIA Code Search: codebook-style lookup (term → matches → full code detail) ----
// A CPT add-on code carries the official parenthetical marker in its descriptor.
export function isAddOn(row) {
  return (
    row &&
    row[0] === 2 &&
    /List separately in addition to code for primary procedure/i.test(row[3] || '')
  );
}

// ICD-10-CM external cause of morbidity chapter (V00-Y99).
export function isExtCause(row) {
  return row && row[0] === 0 && /^[VWXY]/.test(row[2] || '');
}

export function validateCode(code) {
  const n = (code || '').replace(/[.\-\s]/g, '').toUpperCase();
  if (!n) return null;
  if (/^\d{1,2}$|^[A-Z]{2}$/.test(n)) return true; // modifiers (25, 59, LT, RT...)
  const db = window.__CV_CODE_INDEX;
  if (!db) return null; // DB not loaded yet -> unknown
  return db.has(n);
}

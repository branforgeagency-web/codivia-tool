/* CODIVIA platform — code database: decompresses the embedded (gzip + base64) code tables in the browser */
// ---- decompress the embedded gzipped code DB ----
export async function loadCodeDB() {
  const b64 = window.CODE_DB_B64;
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bin]).stream().pipeThrough(ds);
  const text = await new Response(stream).text();
  const parsed = JSON.parse(text); // [ [sysInt, code, disp, desc, billable], ... ]
  // Index of every valid code, used to validate admin-entered / AI-suggested
  // codes on the chart-upload screen before anything is published.
  try {
    window.__CV_CODE_INDEX = new Set(parsed.map((r) => String(r[1]).toUpperCase()));
  } catch (e) {}
  return parsed;
}
export async function loadB64Json(b64Key, cacheKey) {
  if (window[cacheKey]) return window[cacheKey];
  const b64 = window[b64Key];
  if (!b64) return [];
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bin]).stream().pipeThrough(ds);
  const text = await new Response(stream).text();
  window[cacheKey] = JSON.parse(text);
  return window[cacheKey];
}
export async function loadIcdNotes() {
  if (window.ICD_NOTES) return window.ICD_NOTES;
  const b64 = window.ICD_NOTES_B64;
  if (!b64) return {};
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bin]).stream().pipeThrough(ds);
  const text = await new Response(stream).text();
  window.ICD_NOTES = JSON.parse(text);
  return window.ICD_NOTES;
}
// FDA National Drug Code directory (marketing category => Rx vs OTC).
// Populated only when window.FDA_NDC_B64 is present in the build.
export async function loadFdaNdc() {
  if (window.FDA_NDC) return window.FDA_NDC;
  const b64 = window.FDA_NDC_B64;
  if (!b64) return null;
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bin]).stream().pipeThrough(ds);
  window.FDA_NDC = JSON.parse(await new Response(stream).text());
  return window.FDA_NDC;
}
export async function loadIcdEIndex() {
  if (window.ICD_EINDEX) return window.ICD_EINDEX;
  const b64 = window.ICD_EINDEX_B64;
  if (!b64) return [];
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bin]).stream().pipeThrough(ds);
  const text = await new Response(stream).text();
  window.ICD_EINDEX = JSON.parse(text);
  return window.ICD_EINDEX;
}
export async function loadIcdIndex() {
  if (window.ICD_INDEX) return window.ICD_INDEX;
  const b64 = window.ICD_INDEX_B64;
  if (!b64) return [];
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bin]).stream().pipeThrough(ds);
  const text = await new Response(stream).text();
  window.ICD_INDEX = JSON.parse(text);
  return window.ICD_INDEX;
}

// decoded reference tables are cached on window; start empty
window.ICD_INDEX = null;
window.ICD_EINDEX = null;
window.ICD_NOTES = null;
window.ICD_NEO = null;
window.ICD_DRUG = null;

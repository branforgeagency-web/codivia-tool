// Minimal RFC 4180 CSV reader: quoted fields (with "" escapes, commas and line breaks inside quotes),
// CRLF or LF line ends. Returns an array of rows, each an array of strings (not trimmed).
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const start = text.charCodeAt(0) === 0xfeff ? 1 : 0; // skip a byte-order mark
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (quoted) throw new Error('CSV ends inside a quoted field');
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

const isBlankRow = (row) => row.every((c) => String(c).trim() === '');

module.exports = { parseCsv, isBlankRow };

// Text helpers shared by the code seed script and the code search service.

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Index term as matched by the search: parenthetical modifiers dropped, spaces collapsed, lowercased.
// "Abasia(-astasia) (hysterical)" -> "abasia"
const normalizeTerm = (t) =>
  String(t)
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

module.exports = { escapeRegex, normalizeTerm };

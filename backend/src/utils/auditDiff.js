// Audit log helper: which answer-key codes an edit added or removed.
const codesOf = (key) => (Array.isArray(key) ? key.map((a) => String((a && a.code) || '').toUpperCase()).filter(Boolean) : []);

const keyDiff = (beforeKey, afterKey) => {
  const before = new Set(codesOf(beforeKey));
  const after = new Set(codesOf(afterKey));
  const added = [...after].filter((c) => !before.has(c));
  const removed = [...before].filter((c) => !after.has(c));
  const parts = [];
  if (added.length) parts.push('added ' + added.join(', '));
  if (removed.length) parts.push('removed ' + removed.join(', '));
  return { added, removed, text: parts.join('; ') || (afterKey ? 'codes unchanged, details edited' : '') };
};

module.exports = { keyDiff };

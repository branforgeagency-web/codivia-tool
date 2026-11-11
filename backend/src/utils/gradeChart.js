// Grades a student's codes against a chart's answer key. Same rules as the frontend's Coder.jsx,
// and returns the same object, so the result screen can show it unchanged.

const norm = (s) => (s || '').toUpperCase().replace(/[\s.]/g, '');

const sameFamily = (a, b) => {
  if (/^99[2-4]/.test(a) && /^99[2-4]/.test(b)) return true; // E/M level
  if (/^[0-9]/.test(a) && /^[0-9]/.test(b)) return a.slice(0, 3) === b.slice(0, 3); // CPT family
  return a.charAt(0) === b.charAt(0); // same ICD chapter letter
};

const gradeChart = (answerKey, rows, drg) => {
  const userCodes = rows.map((x) => norm(x.code)).filter(Boolean);
  const userMods = rows.map((x) => norm(x.mod)).filter(Boolean);
  const key = answerKey.map((k) => ({ code: norm(k.code), desc: k.desc, type: k.type, why: k.why, raw: k.code }));

  // DRG is scored on its own (inpatient), PDGM is informational, MOD is scored against attached modifiers.
  const drgKey = key.find((k) => k.type === 'DRG');
  const pdgmKey = key.find((k) => k.type === 'PDGM');
  const modKey = key.filter((k) => k.type === 'MOD');
  const codeKey = key.filter((k) => k.type !== 'DRG' && k.type !== 'PDGM' && k.type !== 'MOD');

  const correct = [...codeKey.filter((k) => userCodes.includes(k.code)), ...modKey.filter((k) => userMods.includes(k.code))];
  const missedCodes = codeKey.filter((k) => !userCodes.includes(k.code));
  const missed = [...missedCodes, ...modKey.filter((k) => !userMods.includes(k.code))];

  // Pair each wrong entry with a missed code, preferring the same family, so the report can say
  // "you coded X, the audited code is Y, because...".
  const usedSubs = {};
  const wrong = rows
    .filter((x) => x.code && !codeKey.find((k) => k.code === norm(x.code)))
    .map((x) => {
      const uc = norm(x.code);
      const sub = missedCodes.find((k) => !usedSubs[k.code] && sameFamily(uc, k.code)) || missedCodes.find((k) => !usedSubs[k.code]);
      if (sub) usedSubs[sub.code] = true;
      return { ...x, ...(sub ? { correctedTo: { code: sub.raw || sub.code, desc: sub.desc, why: sub.why } } : {}) };
    });

  const drgOk = drgKey ? (drg || '').split(' — ')[0].trim() === drgKey.code : null;
  const total = codeKey.length + modKey.length + (drgKey ? 1 : 0);
  const got = correct.length + (drgOk ? 1 : 0);
  const accuracy = total ? Math.round((got / total) * 100) : 0;

  return { accuracy, correct, missed, wrong, total, drgKey, drgOk, userDrg: drg, pdgmKey };
};

// What is stored per chart: the frontend's saved progress entry. Only the codes of misses are kept.
const toSavedResult = (res, dept, at) => {
  const saved = { accuracy: res.accuracy, total: res.total, correct: res.correct.length, dept, at };
  if (res.drgOk === true || res.drgOk === false) saved.drgOk = res.drgOk;
  if (res.missed.length) {
    saved.miss = res.missed.map((k) => String(k.raw || k.code || '')).filter(Boolean).slice(0, 12);
  }
  if (res.wrong.length) {
    saved.wrong = res.wrong
      .map((w) => [String(w.code || ''), String(w.correctedTo?.code || '')])
      .filter((x) => x[0])
      .slice(0, 12);
  }
  return saved;
};

module.exports = { gradeChart, toSavedResult };

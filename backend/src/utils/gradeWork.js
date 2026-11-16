// Grades a submitted workspace against a chart's answer key and returns a checklist.
// Every check is one point; accuracy = checks passed / checks made.
//
// submission (already validated):
//   { dx: [{ code, poa }], lines: [{ code, mods: [], units, ptrs: [dxCode] }], pcs: [code],
//     drg, disp, decision, comment, notified }
//
// The answer key's optional fields (poa, mods, units, ptrs) and the chart's keyMeta
// ({ disp, decision }) add checks only where the chart's author set them, so plain charts are
// graded on codes and sequencing alone.

const norm = (s) => String(s || '').toUpperCase().replace(/[\s.]/g, '');
const DX_TYPES = ['PDx', 'SDx', 'Dx'];
const LINE_TYPES = ['CPT', 'HCPCS'];
const POA_LABEL = { Y: 'Y (yes)', N: 'N (no)', U: 'U (unknown)', W: 'W (clinically undetermined)', 1: '1 (exempt)' };
const DECISION_LABEL = { correct: 'correct the charge and resubmit', appeal: 'appeal', writeoff: 'write off' };

const sameFamily = (a, b) => {
  if (/^99[2-4]/.test(a) && /^99[2-4]/.test(b)) return true; // E/M level
  if (/^[0-9]/.test(a) && /^[0-9]/.test(b)) return a.slice(0, 3) === b.slice(0, 3); // CPT family
  return a.charAt(0) === b.charAt(0); // same ICD chapter letter
};
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const list = (arr) => (arr.length ? arr.join(', ') : 'none');

const gradeWork = (chart, sub) => {
  const key = chart.answerKey || [];
  const meta = chart.keyMeta || {};
  const inpatient = !!(chart.isInpatient || key.some((k) => k.type === 'PCS' || k.type === 'DRG'));
  const checks = [];
  const add = (ok, title, why, kind) => checks.push({ ok: !!ok, title, why: why || '', kind });

  const dxKey = key.filter((k) => DX_TYPES.includes(k.type));
  const lineKey = key.filter((k) => LINE_TYPES.includes(k.type));
  const modKey = key.filter((k) => k.type === 'MOD');
  const pcsKey = key.filter((k) => k.type === 'PCS');
  const drgKey = key.find((k) => k.type === 'DRG');

  const dx = (sub.dx || []).filter((d) => d.code);
  const lines = (sub.lines || []).filter((l) => l.code);
  const pcs = (sub.pcs || []).filter(Boolean);
  const dxCodes = dx.map((d) => norm(d.code));

  // ---- denial decision ----
  if (meta.decision) {
    add(sub.decision === meta.decision, `Decision: ${DECISION_LABEL[sub.decision] || 'none'}` + (sub.decision === meta.decision ? '' : ` → should be ${DECISION_LABEL[meta.decision]}`),
      meta.decisionWhy || 'Read the remit codes: a billing error on our side is corrected and resubmitted, not appealed or written off.', 'decision');
  }

  // ---- diagnoses ----
  const pLabel = inpatient ? 'Principal diagnosis' : 'Primary diagnosis';
  dxKey.forEach((k, i) => {
    const code = norm(k.code);
    const at = dxCodes.indexOf(code);
    if (i === 0) {
      const ok = at === 0;
      const title = ok ? `${pLabel} ${k.code}` : at > 0 ? `${k.code} is coded but not sequenced first` : `${pLabel} ${dx[0] ? dx[0].code : '(none)'} → should be ${k.code}`;
      add(ok, title, k.why, 'dx');
    } else {
      add(at >= 0, `Diagnosis ${k.code} ${at >= 0 ? 'reported' : 'missing'}`, k.why, 'dx');
    }
    if (k.poa && at >= 0) {
      const poa = dx[at].poa || '';
      add(poa === k.poa, `${k.code} POA: ${POA_LABEL[poa] || 'blank'}` + (poa === k.poa ? '' : ` → should be ${POA_LABEL[k.poa] || k.poa}`),
        k.poa === '1' ? 'This code is on the POA-exempt list — report 1 (exempt).' : 'POA describes whether the condition was present when the order to admit was written.', 'poa');
    }
  });
  const dxKeyCodes = dxKey.map((k) => norm(k.code));
  const extraDx = dx.filter((d) => !dxKeyCodes.includes(norm(d.code)));
  extraDx.forEach((d) => add(false, `Diagnosis ${d.code} should not be reported`, (meta.extraWhy || {})[d.code] || 'Not supported by the documentation and coding guidelines.', 'dx'));

  // ---- charge lines ----
  lineKey.forEach((k) => {
    const code = norm(k.code);
    const l = lines.find((x) => norm(x.code) === code);
    add(!!l, `Charge ${k.code} ${l ? 'billed' : 'missing'}`, k.why, 'line');
    if (!l) return;
    if (k.mods) {
      const have = (l.mods || []).map(norm).filter(Boolean);
      const want = k.mods.map(norm).filter(Boolean);
      const ok = sameSet(have, want);
      add(ok, `${k.code} modifiers: ${list(have)}` + (ok ? '' : ` → should be ${list(want)}`), k.why, 'mods');
    }
    if (k.units != null) {
      const ok = Number(l.units || 1) === Number(k.units);
      add(ok, `${k.code} units: ${l.units || 1}` + (ok ? '' : ` → should be ${k.units}`), k.why, 'units');
    }
    if (k.ptrs) {
      const have = (l.ptrs || []).map(norm);
      const want = k.ptrs.map(norm);
      const ok = have[0] === want[0] && sameSet(have, want);
      add(ok, `${k.code} diagnosis pointers: ${list(l.ptrs || [])}` + (ok ? '' : ` → should be ${list(k.ptrs)}`), 'Each charge points first to the diagnosis that is the main reason for that service.', 'ptrs');
    }
  });
  modKey.forEach((k) => {
    const ok = lines.some((l) => (l.mods || []).map(norm).includes(norm(k.code)));
    add(ok, `Modifier ${k.code} ${ok ? 'attached' : 'missing'}`, k.why, 'mods');
  });
  const lineKeyCodes = lineKey.map((k) => norm(k.code));
  const extraLines = lineKey.length || lines.length ? lines.filter((l) => !lineKeyCodes.includes(norm(l.code))) : [];
  extraLines.forEach((l) => add(false, `Charge ${l.code} should not be billed`, (meta.extraWhy || {})[l.code] || 'Not documented as performed, or included in another service.', 'line'));

  // ---- procedures (ICD-10-PCS) ----
  const pcsKeyCodes = pcsKey.map((k) => norm(k.code));
  pcsKey.forEach((k) => {
    const ok = pcs.map(norm).includes(norm(k.code));
    add(ok, `Procedure ${k.code} ${ok ? 'coded' : 'missing'}`, k.why, 'pcs');
  });
  pcs.filter((c) => !pcsKeyCodes.includes(norm(c))).forEach((c) =>
    add(false, `Procedure ${c} is incorrect`, (meta.extraWhy || {})[c] || 'Check every character against the documentation (body part, approach, device, qualifier, duration).', 'pcs'));

  // ---- MS-DRG, disposition ----
  let drgOk = null;
  if (drgKey) {
    const mine = String(sub.drg || '').split(' — ')[0].trim();
    drgOk = mine === drgKey.code;
    add(drgOk, `MS-DRG ${mine || '(none)'}` + (drgOk ? ' matches the audit' : ` → audited MS-DRG ${drgKey.code}`), drgKey.why, 'drg');
  }
  if (meta.disp) {
    const ok = sub.disp === meta.disp;
    add(ok, `Discharge disposition ${sub.disp || '(blank)'}` + (ok ? '' : ` → should be ${meta.disp}`), meta.dispWhy || 'Read the discharge summary: disposition changes the payment for post-acute transfer DRGs.', 'abs');
  }

  // ---- denial paperwork ----
  if (chart.workType === 'denial') {
    add(String(sub.comment || '').trim().length >= 10, 'Comment entered', 'Every correction, appeal or write-off needs a comment saying what changed and why, for the audit trail.', 'comment');
    if (sub.decision === 'correct') add(!!sub.notified, 'Charge review team notified of the pending session', 'Corrected charges sit in a pending queue until the charge review team processes them.', 'comment');
  }

  if (!checks.length) add(false, 'Nothing to grade', 'This chart has no answer key.', 'none');
  const correct = checks.filter((c) => c.ok).length;
  const accuracy = Math.round((correct / checks.length) * 100);

  // Missed audited codes, and "you coded X, the audited code is Y" pairs (same family first).
  const missed = [
    ...dxKey.filter((k) => !dxCodes.includes(norm(k.code))),
    ...lineKey.filter((k) => !lines.some((l) => norm(l.code) === norm(k.code))),
    ...pcsKey.filter((k) => !pcs.map(norm).includes(norm(k.code))),
  ];
  const used = new Set();
  const wrong = [...extraDx.map((d) => d.code), ...extraLines.map((l) => l.code)].map((c) => {
    const n = norm(c);
    const sub2 = missed.find((k) => !used.has(k.code) && sameFamily(n, norm(k.code))) || missed.find((k) => !used.has(k.code));
    if (sub2) used.add(sub2.code);
    return [c, sub2 ? sub2.code : ''];
  });

  return { accuracy, total: checks.length, correct, checks, drgOk, missed: missed.map((k) => k.code), wrong, drgKey: drgKey ? { code: drgKey.code, desc: drgKey.desc } : null };
};

// What is stored in ChartResult (same fields as before).
const toSaved = (res, dept, at) => {
  const saved = { accuracy: res.accuracy, total: res.total, correct: res.correct, dept, at };
  if (res.drgOk === true || res.drgOk === false) saved.drgOk = res.drgOk;
  if (res.missed.length) saved.miss = res.missed.slice(0, 12);
  if (res.wrong.length) saved.wrong = res.wrong.slice(0, 12);
  return saved;
};

module.exports = { gradeWork, toSaved, norm };

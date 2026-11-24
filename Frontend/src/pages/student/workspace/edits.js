/* CODIVIA — workspace edits (claim scrubber). Runs live on every change.
   Generic rules for any chart, plus Excludes1 / "use additional code" checks from the ICD-10-CM
   tabular notes in the database (GET /codes/notes/:code, fetched per diagnosis). */
import { isBillable, isEM, LETTERS, norm, settingOf } from './model.js';

// Code references inside a note line, e.g. "(E11.22, E13.22)" or "(N18.1-N18.6)" → ['E1122', 'E1322', 'N181', 'N186'].
const refsIn = (line) => {
  const out = [];
  const re = /\b([A-Z][0-9][0-9A-Z])(?:\.([0-9A-Z]{1,4}))?-?/g;
  let m;
  while ((m = re.exec(line))) out.push(m[1] + (m[2] || ''));
  return out;
};

const isProcedureLine = (c) => !isEM(c) && !/^[JGT]/.test(c) && !/F$/.test(c) && !/^G2211$/.test(c);

// lookupIcd(code) -> code DB row for an ICD-10-CM code, or null; omitted while the code DB is not loaded.
export function runEdits({ chart, draft: d, notes = {}, describe = () => '', lookupIcd = null }) {
  const set = settingOf(chart);
  const out = [];
  const add = (sev, tab, title, msg, src, line) =>
    out.push({ sev, tab, title, msg, src, line, key: (tab + '|' + title + '|' + msg).slice(0, 280) });
  const codes = d.dx.map((x) => norm(x.code));
  const P = set.firstListed; // 'principal' (IP) or 'primary' (OP)
  const PT = P === 'principal' ? 'Principal' : 'Primary';
  const other = P === 'principal' ? 'primary' : 'principal';
  const OCG = set.ip ? 'OCG Section II' : 'OCG Section IV';

  // ---------- diagnoses: classification and sequence (OP primary / IP principal) ----------
  if (!d.dx.length) add('err', 'dx', 'No diagnosis', `Add the ${P} diagnosis first.`, 'Claim edit');
  const firsts = d.dx.filter((x) => x.cls === P);
  if (d.dx.length && !firsts.length) add('err', 'dx', `Missing ${P} diagnosis`, `Classify one diagnosis as the ${P} diagnosis — ${set.ip ? 'the condition established after study to be chiefly responsible for the admission' : 'the reason chiefly responsible for the outpatient services'}.`, OCG);
  if (firsts.length > 1) add('err', 'dx', `Multiple ${P} diagnoses`, `Only one ${P} diagnosis is allowed: ${firsts.map((x) => x.code).join(', ')}. Classify the others as secondary.`, OCG);
  if (firsts.length === 1 && d.dx[0] !== firsts[0]) add('err', 'dx', 'Incorrect diagnosis sequence', `The ${P} diagnosis (${firsts[0].code}) must be sequenced first.`, OCG);
  d.dx.forEach((x) => {
    if (!x.cls) add('err', 'dx', 'Diagnosis type missing', `${x.code}: choose ${P} or secondary diagnosis.`, 'Claim edit');
    else if (x.cls === other)
      add('err', 'dx', 'Incorrect diagnosis classification', `${x.code} is classified as ${other} diagnosis — ${set.ip ? 'inpatient' : 'outpatient'} charts use “${P} diagnosis”. Edit it.`, OCG);
    if (lookupIcd) {
      const row = lookupIcd(x.code);
      if (!row) add('err', 'dx', 'Invalid ICD-10-CM code', `${x.code} is not a valid code in the current ICD-10-CM code set.`, 'ICD-10-CM code set');
      else if (!isBillable(row)) add('err', 'dx', 'Header code', `${x.code} is not billable — code to the highest specificity.`, 'ICD-10-CM code set');
    }
  });
  const seen = {};
  d.dx.forEach((x, i) => {
    const c = norm(x.code);
    const desc = x.desc || describe(x.code);
    if (seen[c]) add('err', 'dx', 'Duplicate diagnosis', `${x.code} is listed twice.`, 'Claim edit');
    seen[c] = true;
    if (set.inpatient && !x.poa) add('err', 'dx', 'POA indicator missing', `${x.code}: a present-on-admission indicator is required.`, 'Medicare POA reporting');
    if (/\bunspecified\b/i.test(desc)) add('warn', 'dx', 'Unspecified diagnosis', `${x.code} is unspecified — check the documentation for a more specific code.`, 'Specificity');
    if (i === 0 && set.inpatient && /^[V-Y]/.test(c)) add('err', 'dx', 'Unacceptable principal diagnosis', `${x.code} is an external-cause code and cannot be the principal diagnosis.`, 'MCE · unacceptable PDx');
    if (i === 0 && set.inpatient && /^Z/.test(c) && d.dx.length > 1) add('warn', 'dx', 'Z code as principal diagnosis', `${x.code} is a Z code. Most Z codes cannot be the principal diagnosis — check the sequencing.`, 'MCE');
  });
  const definitive = codes.some((c) => !/^[RZ]/.test(c));
  d.dx.forEach((x, i) => {
    if (!/^R/.test(norm(x.code)) || !definitive) return;
    add('warn', 'dx', i === 0 ? `${PT} diagnosis is a symptom code` : 'Sign/symptom with a confirmed diagnosis',
      i === 0 ? `${x.code} is a symptom. A confirmed diagnosis that explains the encounter should be listed first.` : `${x.code} may be integral to a confirmed diagnosis and not coded separately.`, 'OCG I.B.5');
  });

  // Tabular notes from the database: Excludes1 conflicts and "use additional code" prompts.
  d.dx.forEach((x) => {
    const n = notes[norm(x.code)];
    if (!n || !n.results) return;
    n.results.forEach((r) => {
      (r.notes.ex1 || []).forEach((line) => {
        refsIn(line).forEach((ref) => {
          d.dx.forEach((other) => {
            const o = norm(other.code);
            if (other === x || !o.startsWith(ref)) return;
            const pair = [norm(x.code), o].sort().join('+');
            if (out.some((e) => e.pair === pair)) return;
            add('err', 'dx', 'Conflicting diagnoses (Excludes1)', `${x.code} and ${other.code} cannot be reported together — Excludes1 at ${r.code}: “${line}”.`, 'ICD-10-CM tabular · Excludes1');
            out[out.length - 1].pair = pair;
          });
        });
      });
      // One prompt per code and note kind, listing the instructions whose codes are not on the claim yet.
      [['use', 'Use additional code'], ['first', 'Code first'], ['also', 'Code also']].forEach(([k, label]) => {
        const open = (r.notes[k] || []).filter((line) => {
          const refs = refsIn(line);
          return refs.length && !refs.some((ref) => codes.some((c) => c !== norm(x.code) && c.startsWith(ref.slice(0, 3))));
        });
        if (open.length) add('info', 'dx', `${label} — ${x.code}`, open.slice(0, 3).join(' · ') + (open.length > 3 ? ` (+${open.length - 3} more)` : ''), 'ICD-10-CM tabular · ' + r.code);
      });
    });
  });

  // ---------- charge lines ----------
  if (set.hasLines) {
    if (!d.lines.length && chart.workType !== 'denial') add('err', 'lines', 'No charges', 'Add at least one charge line (E/M level or procedure).', 'Claim edit');
    const ptype = (chart.encounter && chart.encounter.ptype) || '';
    const seenLine = {};
    d.lines.forEach((l, i) => {
      const n = i + 1;
      const c = norm(l.code);
      if (!l.ptrs.length) add('err', 'lines', 'Missing diagnosis pointer', `Line ${n} (${l.code}) is not linked to any diagnosis.`, 'CMS-1500 box 24E', n);
      if (seenLine[c]) add('err', 'lines', 'Duplicate charge', `${l.code} appears on lines ${seenLine[c]} and ${n}. Use units instead.`, 'Claim edit', n);
      seenLine[c] = seenLine[c] || n;
      if (/^9920[2-5]$/.test(c) && ptype === 'est') add('err', 'lines', 'New-patient code on an established patient', `Line ${n}: ${l.code} is a new-patient code but the patient is established${chart.encounter && chart.encounter.lastSeen ? ' (last seen ' + chart.encounter.lastSeen + ')' : ''}.`, 'Patient status', n);
      if (/^9921[1-5]$/.test(c) && ptype === 'new') add('warn', 'lines', 'Established-patient code on a new patient', `Line ${n}: ${l.code} is for established patients.`, 'Patient status', n);
      if (l.mods.includes('25') && !isEM(c)) add('warn', 'lines', 'Modifier 25 on a non-E/M code', `Line ${n}: modifier 25 is only valid on an E/M service.`, 'Modifier rules', n);
    });
    const emIdx = d.lines.findIndex((l) => isEM(norm(l.code)));
    const hasProc = d.lines.some((l) => isProcedureLine(norm(l.code)));
    if (emIdx > -1 && hasProc && !d.lines[emIdx].mods.includes('25') && !d.lines[emIdx].mods.includes('57'))
      add('warn', 'lines', 'E/M review for 25/59 modifier', 'An E/M is billed with a procedure on the same day. Review whether modifier 25 (or 57) is needed.', 'NCCI', emIdx + 1);
    if (d.lines.some((l) => /^9637[2-4]$/.test(norm(l.code))) && !d.lines.some((l) => /^J/.test(norm(l.code))))
      add('warn', 'lines', 'Injection without drug supply code', 'An injection administration code is billed with no drug (J-code) line.', 'Claim edit');
    if (d.lines.length)
      d.dx.forEach((x, k) => {
        if (!d.lines.some((l) => l.ptrs.includes(x.id))) add('warn', 'lines', 'Diagnosis not linked to a charge', `${LETTERS[k] || k + 1} · ${x.code} is not pointed to by any charge line.`, 'Claim edit');
      });
  }

  // ---------- inpatient ----------
  if (set.inpatient) {
    if (set.hasDRG && !d.drg) add('err', 'drg', 'MS-DRG not assigned', 'Assign the MS-DRG from the principal diagnosis, procedures and CC/MCCs.', 'Inpatient claim edit');
    if (!d.abs.disp) add('err', 'abs', 'Discharge disposition missing', 'Choose the discharge disposition (UB-04 FL 17).', 'UB-04 required field');
    if (!d.abs.admitType) add('warn', 'abs', 'Admission type missing', 'Choose the admission type (UB-04 FL 14).', 'UB-04');
    if (set.hasPCS && !d.pcs.length) add('info', 'pcs', 'Procedure check', 'No ICD-10-PCS procedure coded. Check the record for reportable procedures (ventilation, lines, surgery…).', 'Coder prompt');
  }
  return out;
}

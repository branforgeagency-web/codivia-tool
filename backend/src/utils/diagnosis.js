// Diagnosis list rules for OP / IP charts (the same rules the workspace's Edits & Scrubber shows).
// Used when a chart is submitted: the encounter type comes from the chart record, never the request.
//
//   dx: [{ code, cls }] in sequence order (cls = primary | principal | secondary)
//   encounterType: 'OP' | 'IP'
//   lookup: Map(normalised code -> { billable }) of the ICD-10-CM codes found in the code set
//
// Returns [{ rule, code, message }]; an empty list means the diagnoses can be scored.

const { DX_CLASSES, DX_CLASS_LABELS, ENCOUNTER_TYPE_LABELS, firstListedClass } = require('../config/encounter');

const norm = (s) => String(s || '').toUpperCase().replace(/[\s.]/g, '');
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

const checkDiagnoses = (dx, { encounterType, lookup }) => {
  const issues = [];
  const add = (rule, message, code = '') => issues.push({ rule, code, message });
  const first = firstListedClass(encounterType);
  const firstLabel = DX_CLASS_LABELS[first];
  const wrongFirst = first === DX_CLASSES.PRINCIPAL ? DX_CLASSES.PRIMARY : DX_CLASSES.PRINCIPAL;
  const rows = (dx || []).filter((d) => d && d.code);

  if (!rows.length) {
    add('dx.none', `Add the ${lower(firstLabel)} before submitting.`);
    return issues;
  }

  const seen = new Set();
  rows.forEach((d) => {
    const c = norm(d.code);
    if (seen.has(c)) add('dx.duplicate', `${d.code} is listed more than once.`, d.code);
    seen.add(c);
    if (!d.cls) add('dx.class.missing', `${d.code} has no diagnosis type. Classify it as ${lower(firstLabel)} or secondary diagnosis.`, d.code);
    else if (d.cls === wrongFirst)
      add('dx.class.encounter', `${d.code} is classified as ${lower(DX_CLASS_LABELS[wrongFirst])}, which is not used on ${lower(ENCOUNTER_TYPE_LABELS[encounterType])} charts. Use ${lower(firstLabel)}.`, d.code);
    if (lookup) {
      const hit = lookup.get(c);
      if (!hit) add('dx.code.invalid', `${d.code} is not a valid ICD-10-CM code in the current code set.`, d.code);
      else if (!hit.billable) add('dx.code.header', `${d.code} is a header (non-billable) code. Code to the highest specificity.`, d.code);
    }
  });

  const firsts = rows.filter((d) => d.cls === first);
  if (!firsts.length) add('dx.first.missing', `No ${lower(firstLabel)}. ${encounterType === 'IP' ? 'Inpatient' : 'Outpatient'} claims need one.`);
  else if (firsts.length > 1) add('dx.first.multiple', `Only one ${lower(firstLabel)} is allowed (${firsts.map((d) => d.code).join(', ')}).`);
  else if (rows[0].cls !== first) add('dx.sequence', `The ${lower(firstLabel)} (${firsts[0].code}) must be sequenced first.`, firsts[0].code);

  return issues;
};

module.exports = { checkDiagnoses, norm };

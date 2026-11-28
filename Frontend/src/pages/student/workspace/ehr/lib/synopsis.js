import { parseRecordSections } from '../../recordSections.js';
import { sectionsText, visitSections, VITAL_LIST, vitalsOf } from './chartText.js';

// Compare chart-local dates on a common axis without converting them to the browser's timezone.
export function synopsisTime(value = '') {
  const date = String(value ?? '').trim();
  const match = date.match(
    /^(?:(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})\/(\d{1,2})\/(\d{4}))(?=$|[T\s])(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i,
  );
  if (!match) return null;
  const [
    ,
    year,
    month,
    day,
    usMonth,
    usDay,
    usYear,
    hour = '0',
    minute = '0',
    second = '0',
    meridiem,
  ] = match;
  const h = meridiem
    ? (Number(hour) % 12) + (meridiem.toUpperCase() === 'PM' ? 12 : 0)
    : Number(hour);
  const time = Date.UTC(
    Number(year || usYear),
    Number(month || usMonth) - 1,
    Number(day || usDay),
    h,
    Number(minute),
    Number(second),
  );
  const parsed = new Date(time);
  return parsed.getUTCDate() === Number(day || usDay) &&
    h < 24 &&
    Number(minute) < 60 &&
    Number(second) < 60
    ? time
    : null;
}

export function synopsisData(chart, docs) {
  const clinical = chart.clinical || {};
  const observations = [];
  const events = [];
  const observe = (kind, name, date, value, unit = '', detail = '') => {
    if (!name || value == null || value === '') return;
    const pressure =
      /^(BP|Blood Pressure)$/i.test(name) && String(value).match(/^(\d+)\s*\/\s*(\d+)$/);
    if (pressure) {
      observations.push({
        kind,
        name: `${name} (systolic)`,
        date,
        value: pressure[1],
        unit,
        detail,
      });
      observations.push({
        kind,
        name: `${name} (diastolic)`,
        date,
        value: pressure[2],
        unit,
        detail,
      });
      return;
    }
    observations.push({ kind, name, date, value, unit, detail });
  };
  const event = (kind, name, date, detail) => {
    if (name) events.push({ kind, name, date, detail });
  };
  const visitVitals = (date, sections) => {
    const vitals = vitalsOf(sectionsText(sections));
    VITAL_LIST.forEach(({ key, label, unit }) => {
      const reading = vitals[key];
      if (!reading) return;
      const withUnit = reading.match(/^([\d.]+)\s*(°[FC]|kg|lbs?|cm|in|m)$/i);
      observe('Visit vitals', label, date, withUnit?.[1] || reading, withUnit?.[2] || unit);
    });
  };

  const dos = chart.encounter?.dos;
  visitVitals(dos, visitSections(docs));
  (chart.previousRecords || []).forEach((visit) => {
    visitVitals(visit.dos, parseRecordSections(visit.body || ''));
    event('Encounter', visit.title, visit.dos, visit.provider);
  });
  (clinical.labs || []).forEach((lab) =>
    observe(
      'Labs',
      lab.test,
      lab.collected,
      lab.value,
      lab.units,
      [lab.flag, lab.status].filter(Boolean).join(' · '),
    ),
  );
  (clinical.flowsheetEntries || []).forEach((entry) =>
    observe(
      `Flowsheets · ${entry.group || 'Measurements'}`,
      entry.measure,
      entry.recordedAt,
      entry.value,
      entry.unit,
      entry.note,
    ),
  );
  (clinical.meds || []).forEach((med) => {
    const details = [med.dose, med.route, med.frequency, med.status].filter(Boolean).join(' · ');
    if (med.start || !med.end)
      event(med.start ? 'Medication start' : 'Medication history', med.name, med.start, details);
    if (med.end) event('Medication end', med.name, med.end, details);
  });
  (clinical.given || []).forEach((med) => {
    const start =
      /^\d{1,2}:/.test(med.start || '') && synopsisTime(dos) !== null
        ? `${dos.split(/[T ]/)[0]} ${med.start}`
        : med.start || dos;
    event(
      'Administration',
      med.drug,
      start,
      [med.dose, med.route, med.givenBy].filter(Boolean).join(' · '),
    );
  });
  (clinical.treatments || []).forEach((plan) => {
    event(
      'Treatment plan',
      plan.plan,
      plan.start,
      [plan.status, plan.schedule, plan.sessions].filter(Boolean).join(' · '),
    );
    if (plan.end) event('Treatment plan end', plan.plan, plan.end, plan.status);
  });
  (clinical.procedures || []).forEach((procedure) =>
    event(
      'Procedure',
      procedure.procedure,
      procedure.date,
      [procedure.status, procedure.performedBy].filter(Boolean).join(' · '),
    ),
  );

  const dated = (rows) => rows.map((row) => ({ ...row, time: synopsisTime(row.date) }));
  return { observations: dated(observations), events: dated(events) };
}

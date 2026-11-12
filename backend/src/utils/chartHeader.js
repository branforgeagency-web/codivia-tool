// The queue columns, read from the first lines of a chart's record (same rules as the frontend's
// DeptQueue queueFields): MRN, date of service (or start of care / admission), payer, facility,
// and new / established patient.
const chartHeader = (record) => {
  const out = { mrn: '', dos: '', dosLabel: '', payer: '', facility: '', ptype: '' };
  if (!record) return out;
  const lines = String(record).split('\n');
  for (let i = 0; i < lines.length && i < 14; i += 1) {
    const l = lines[i];
    let m;
    if (!out.mrn && (m = l.match(/^MRN:\s*([^\s]+)/))) out.mrn = m[1];
    if (!out.payer && (m = l.match(/^Insurance:\s*(.+)$/))) out.payer = m[1].trim();
    if (!out.facility && (m = l.match(/^Facility:\s*(.+)$/))) out.facility = m[1].trim();
    if (!out.dos && (m = l.match(/^Date of Service:\s*(.+)$/))) out.dos = m[1].trim();
    if (!out.dos && (m = l.match(/^SOC Date:\s*(.+)$/))) {
      out.dos = m[1].trim();
      out.dosLabel = 'Start of care';
    }
    if (!out.dos && (m = l.match(/^Admission Date:\s*(.+)$/))) {
      out.dos = m[1].trim();
      out.dosLabel = 'Admission';
    }
    if (!out.ptype && (m = l.match(/^Patient type:\s*(New patient|Established patient)/i))) out.ptype = m[1];
  }
  // A header line may carry a second field after the date (e.g. "Arrival Time: 15:27").
  if (out.dos) {
    const cut = out.dos.match(/^(.*?)\s{2,}[A-Z][A-Za-z ]{2,}:\s*\S/) || out.dos.match(/^(\S+)\s+[A-Z][A-Za-z ]{2,}:\s*\S/);
    if (cut) out.dos = cut[1].trim();
  }
  return out;
};

// Header lines the queue search looks in.
const HEADER_FIELDS = ['MRN', 'Insurance', 'Facility', 'Date of Service', 'SOC Date', 'Admission Date'];

module.exports = { chartHeader, HEADER_FIELDS };

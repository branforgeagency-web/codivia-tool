const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractFileText } = require('../src/services/chartUpload.service');

const pdfFile = (text) => {
  const stream = `BT /F1 12 Tf 10 100 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let source = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(source));
    source += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(source);
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  source += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  source += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(source);
};

test('extracts UTF-8 text files and returns a safe source filename', async () => {
  const result = await extractFileText({
    originalname: 'record.txt',
    buffer: Buffer.from('\uFEFFPatient record\nDiagnosis: Example', 'utf8'),
  });
  assert.equal(result.fileName, 'record.txt');
  assert.equal(result.text, 'Patient record\nDiagnosis: Example');
});

test('extracts text from a PDF on the server', async () => {
  const result = await extractFileText({
    originalname: 'record.pdf',
    buffer: pdfFile('Chart text extracted'),
  });
  assert.match(result.text, /Chart text extracted/);
});

test('rejects invalid PDFs and text over the chart record limit', async () => {
  await assert.rejects(
    extractFileText({ originalname: 'bad.pdf', buffer: Buffer.from('not a PDF') }),
    { statusCode: 400 },
  );
  await assert.rejects(
    extractFileText({ originalname: 'long.txt', buffer: Buffer.alloc(200001, 97) }),
    { statusCode: 413 },
  );
});

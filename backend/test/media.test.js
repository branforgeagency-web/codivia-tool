const test = require('node:test');
const assert = require('node:assert');
const { S3Client } = require('@aws-sdk/client-s3');
const mediaService = require('../src/services/media.service');

// S3 is stubbed: nothing is sent to the bucket.
const file = (name, size = 12) => ({ originalname: name, size, buffer: Buffer.alloc(size, 1) });

test('uploadFile stores a chart file under charts/yyyy/mm and returns its public URL', async (t) => {
  const sent = [];
  t.mock.method(S3Client.prototype, 'send', async (command) => {
    sent.push(command.input);
    return {};
  });
  const out = await mediaService.uploadFile(file('Chest Pain (final).PDF'), 'charts');
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].ContentType, 'application/pdf');
  assert.match(out.key, /^charts\/\d{4}\/\d{2}\/[0-9a-f-]{36}-chest-pain-final\.pdf$/);
  assert.strictEqual(sent[0].Key, out.key);
  assert.ok(out.url.startsWith('https://codivia.s3.ap-south-1.amazonaws.com/charts/'));
  assert.deepStrictEqual([out.name, out.size, out.folder], ['Chest Pain (final).PDF', 12, 'charts']);
});

test('uploadFile rejects unsupported types, oversize files and unknown folders before S3', async (t) => {
  const send = t.mock.method(S3Client.prototype, 'send', async () => ({}));
  await assert.rejects(mediaService.uploadFile(file('virus.exe'), 'charts'), /Unsupported file type/);
  await assert.rejects(mediaService.uploadFile(file('big.pdf', 11 * 1024 * 1024), 'charts'), /10 MB/);
  await assert.rejects(mediaService.uploadFile(file('a.pdf'), 'nope'), /Unknown media folder/);
  assert.strictEqual(send.mock.callCount(), 0);
});

test('uploadFile turns an S3 failure into a 503', async (t) => {
  t.mock.method(S3Client.prototype, 'send', async () => {
    const e = new Error('denied');
    e.name = 'AccessDenied';
    throw e;
  });
  await assert.rejects(mediaService.uploadFile(file('a.txt'), 'charts'), (e) => e.statusCode === 503 && /AccessDenied/.test(e.message));
});

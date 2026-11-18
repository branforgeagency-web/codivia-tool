const { adminWorkService: s, auditService: audit } = require('../services');
const httpStatus = require('../utils/httpStatus');

const workTarget = (req) => ({ type: 'work', id: req.params.workId });

const getWork = async (req, res) => {
  res.status(httpStatus.OK).json(await s.queryWork(req.query));
};

const getSummary = async (req, res) => {
  res.status(httpStatus.OK).json(await s.summary());
};

const returnToStudent = async (req, res) => {
  const out = await s.returnToStudent(req.params.workId, req.body, req.user);
  await audit.record(req.user, 'work.return', { target: workTarget(req), summary: req.body.note || 'Back to the student’s To do list' });
  res.status(httpStatus.OK).json(out);
};

const addNote = async (req, res) => {
  const out = await s.addNote(req.params.workId, req.body, req.user);
  await audit.record(req.user, 'work.note', { target: workTarget(req), summary: req.body.text });
  res.status(httpStatus.CREATED).json(out);
};

const resolveTransfer = async (req, res) => {
  const out = await s.resolveTransfer(req.params.workId, req.body, req.user);
  const verdict = req.body.verdict === 'correct' ? 'Right queue' : 'Wrong queue';
  await audit.record(req.user, 'work.resolve', {
    target: workTarget(req),
    summary: verdict + (req.body.note ? ': ' + req.body.note : ''),
    details: { verdict: req.body.verdict },
  });
  res.status(httpStatus.OK).json(out);
};

module.exports = { getWork, getSummary, returnToStudent, addNote, resolveTransfer };

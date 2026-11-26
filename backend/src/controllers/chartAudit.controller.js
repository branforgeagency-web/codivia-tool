const { chartAuditService: s, auditService: audit } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getMeta = (req, res) => {
  res.status(httpStatus.OK).json(s.getMeta());
};

const getSummary = async (req, res) => {
  res.status(httpStatus.OK).json(await s.getSummary(req.user));
};

const getStudents = async (req, res) => {
  res.status(httpStatus.OK).json(await s.getStudents(req.user, req.query));
};

const getQueue = async (req, res) => {
  res.status(httpStatus.OK).json(await s.getQueue(req.user, req.query));
};

const getAudit = async (req, res) => {
  res.status(httpStatus.OK).json(await s.getAudit(req.user, req.params.studentId, req.params.chartId));
};

const saveAudit = async (req, res) => {
  const { studentId, chartId } = req.params;
  const out = await s.saveAudit(req.user, studentId, chartId, req.body);
  if (req.body.complete) {
    const label = await audit.labelOf('student', studentId);
    await audit.record(req.user, 'audit.complete', {
      target: { type: 'student', id: studentId, label: `${chartId} · ${label}` },
      summary: `${out.wasCompleted ? 'Updated' : 'Completed'} audit — ${req.body.verdict === 'agree' ? 'agreed with' : 'adjusted'} ${out.autoAccuracy}%${
        req.body.verdict === 'agree' ? '' : ' → ' + out.finalAccuracy + '%'
      }`,
      details: { chart: chartId, verdict: req.body.verdict, autoAccuracy: out.autoAccuracy, finalAccuracy: out.finalAccuracy, findings: req.body.findings.length },
    });
  }
  res.status(httpStatus.OK).json(out);
};

module.exports = { getMeta, getSummary, getStudents, getQueue, getAudit, saveAudit };

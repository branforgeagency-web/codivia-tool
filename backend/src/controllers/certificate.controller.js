const { certificateService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getCertificates = async (req, res) => {
  res.status(httpStatus.OK).json(await certificateService.queryCertificates(req.query, req.user));
};

const getCertificate = async (req, res) => {
  res.status(httpStatus.OK).json(await certificateService.getCertificate(req.params.certificateId, req.user));
};

const verifyCertificate = async (req, res) => {
  res.status(httpStatus.OK).json(await certificateService.verifyCertificate(req.params.certificateNo));
};

module.exports = { getCertificates, getCertificate, verifyCertificate };

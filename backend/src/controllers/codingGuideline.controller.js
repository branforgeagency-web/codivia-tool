const { codingGuidelineService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const listCodingGuidelines = async (req, res) => {
  res.status(httpStatus.OK).json(await codingGuidelineService.listCodingGuidelines());
};

module.exports = { listCodingGuidelines };

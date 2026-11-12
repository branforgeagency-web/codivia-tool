const { CodingGuideline } = require('../models');

const listCodingGuidelines = () => CodingGuideline.find({ isActive: true }).sort({ order: 1, _id: 1 });

module.exports = { listCodingGuidelines };

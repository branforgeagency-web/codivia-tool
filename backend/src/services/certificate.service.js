const crypto = require('crypto');
const { Certificate, ChartResult, Department } = require('../models');
const { MANAGER_ROLES } = require('../config/roles');
const { CERT_THRESHOLD, CERT_NUMBER } = require('../config/certificates');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const DUPLICATE_KEY = 11000;
const NUMBER_ATTEMPTS = 5;

const isManager = (actor) => MANAGER_ROLES.includes(actor.role);
const notFound = () => new ApiError(httpStatus.NOT_FOUND, 'Certificate not found');

const newCertificateNo = (date) => {
  const { prefix, length, alphabet } = CERT_NUMBER;
  const random = Array.from({ length }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  return `${prefix}-${date.getFullYear()}-${random}`;
};

// Issues the department's certificate if the student has just qualified.
// Returns it when newly issued, otherwise null. Safe to call after every submission.
const issueIfEarned = async (student, dept, fallbackDeptName) => {
  const scores = await ChartResult.find({ student: student._id, dept }).select('accuracy').lean();
  if (scores.length < CERT_THRESHOLD) return null;
  if (await Certificate.exists({ student: student._id, dept })) return null;

  const department = await Department.findById(dept).select('name elements').lean();
  const issuedAt = new Date();
  const fields = {
    student: student._id,
    studentName: student.name,
    studentCode: student.studentId || null,
    dept,
    deptName: department?.name || fallbackDeptName,
    elements: department?.elements || [],
    worked: scores.length,
    avg: Math.round(scores.reduce((sum, s) => sum + s.accuracy, 0) / scores.length),
    issuedAt,
  };

  for (let attempt = 0; attempt < NUMBER_ATTEMPTS; attempt += 1) {
    try {
      return await Certificate.create({ ...fields, certificateNo: newCertificateNo(issuedAt) });
    } catch (err) {
      if (err.code !== DUPLICATE_KEY) throw err;
      // Two submissions at once: the other one already issued it.
      if (await Certificate.exists({ student: student._id, dept })) return null;
      // Otherwise the random number was already taken; try another.
    }
  }
  throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Could not generate a certificate number');
};

// Students see their own certificates; managers see everyone's and can filter.
const queryCertificates = async ({ student, dept, sortBy = 'issuedAt', order = 'desc', page = 1, limit = 10 }, actor) => {
  const filter = isManager(actor) ? {} : { student: actor._id };
  if (student && isManager(actor)) filter.student = student;
  if (dept) filter.dept = dept;
  const [results, totalResults] = await Promise.all([
    Certificate.find(filter)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Certificate.countDocuments(filter),
  ]);
  return { results, page, limit, totalPages: Math.max(1, Math.ceil(totalResults / limit)), totalResults };
};

const getCertificate = async (id, actor) => {
  const certificate = await Certificate.findOne({ _id: id, ...(isManager(actor) ? {} : { student: actor._id }) });
  if (!certificate) throw notFound();
  return certificate;
};

// Public check of a certificate number. Returns only what is printed on the certificate.
const verifyCertificate = async (certificateNo) => {
  const c = await Certificate.findOne({ certificateNo }).lean();
  if (!c) throw notFound();
  return { valid: true, certificateNo: c.certificateNo, studentName: c.studentName, deptName: c.deptName, worked: c.worked, avg: c.avg, issuedAt: c.issuedAt };
};

module.exports = { issueIfEarned, queryCertificates, getCertificate, verifyCertificate };

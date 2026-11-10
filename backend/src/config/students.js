const STUDENT_ID = Object.freeze({
  counter: 'students', // Counter document that issues the numbers
  prefix: 'STU-',
  digits: 5, // STU-00001
});

const formatStudentId = (n) => STUDENT_ID.prefix + String(n).padStart(STUDENT_ID.digits, '0');

module.exports = { STUDENT_ID, formatStudentId };

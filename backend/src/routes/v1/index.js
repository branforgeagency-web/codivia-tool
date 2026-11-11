const express = require('express');
const healthRoute = require('./health.route');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const accessRoute = require('./access.route');
const departmentRoute = require('./department.route');
const codeRoute = require('./code.route');
const resumeRoute = require('./resume.route');

const router = express.Router();

const routes = [
  { path: '/health', route: healthRoute },
  { path: '/auth', route: authRoute },
  { path: '/users', route: userRoute },
  { path: '/access', route: accessRoute },
  { path: '/departments', route: departmentRoute },
  { path: '/codes', route: codeRoute },
  { path: '/resumes', route: resumeRoute },
];

routes.forEach(({ path, route }) => router.use(path, route));

module.exports = router;

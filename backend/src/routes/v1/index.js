const express = require('express');
const healthRoute = require('./health.route');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const accessRoute = require('./access.route');
const departmentRoute = require('./department.route');
const departmentPoolRoute = require('./departmentPool.route');
const adminDepartmentRoute = require('./adminDepartment.route');
const adminChartRoute = require('./adminChart.route');
const codeRoute = require('./code.route');
const resumeRoute = require('./resume.route');
const chartResultRoute = require('./chartResult.route');
const certificateRoute = require('./certificate.route');
const myChartRoute = require('./myChart.route');

const router = express.Router();

const routes = [
  { path: '/health', route: healthRoute },
  { path: '/auth', route: authRoute },
  { path: '/users', route: userRoute },
  { path: '/access', route: accessRoute },
  { path: '/departments', route: departmentRoute },
  { path: '/department-pools', route: departmentPoolRoute },
  { path: '/admin/departments', route: adminDepartmentRoute },
  { path: '/admin/charts', route: adminChartRoute },
  { path: '/codes', route: codeRoute },
  { path: '/resumes', route: resumeRoute },
  { path: '/chart-results', route: chartResultRoute },
  { path: '/certificates', route: certificateRoute },
  { path: '/my-charts', route: myChartRoute },
];

routes.forEach(({ path, route }) => router.use(path, route));

module.exports = router;

const { accessService } = require('../services');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

// Use after auth(): permit('users', 'edit') passes only when the user's role has that action on that module.
const permit = (module, action) => async (req, res, next) => {
  if (!req.user) throw new ApiError(httpStatus.UNAUTHORIZED, 'Please sign in to continue');
  if (!(await accessService.can(req.user.role, module, action))) {
    throw new ApiError(httpStatus.FORBIDDEN, "You don't have permission to do this");
  }
  next();
};

module.exports = permit;

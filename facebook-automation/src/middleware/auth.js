const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if ((config.env === 'development' || config.env === 'test') && process.env.SKIP_AUTH === 'true') {
      req.user = { id: 'admin-dev', role: 'admin', email: 'admin@dev.local' };
      return next();
    }
    return next(new AuthenticationError('Authorization header missing or malformed'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    if ((config.env === 'development' || config.env === 'test') && process.env.SKIP_AUTH === 'true') {
      req.user = { id: 'admin-dev', role: 'admin', email: 'admin@dev.local' };
      return next();
    }
    next(new AuthenticationError('Invalid or expired authentication token'));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new AuthorizationError('You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = {
  authenticate,
  authorize
};

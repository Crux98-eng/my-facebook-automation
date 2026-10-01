const logger = require('../config/logger');
const config = require('../config/env');
const { CustomError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  const requestId = req.id || 'unknown';
  
  if (err instanceof CustomError) {
    logger.warn(`Operational Error [${err.code}]: ${err.message}`, {
      requestId,
      statusCode: err.statusCode,
      details: err.details,
      path: req.originalUrl
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details })
      }
    });
  }

  // Handle unexpected or internal errors
  logger.error(`Unhandled System Error: ${err.message}`, {
    requestId,
    stack: err.stack,
    path: req.originalUrl
  });

  const statusCode = err.status || err.statusCode || 500;
  const responseMessage = config.env === 'production' 
    ? 'An internal server error occurred' 
    : err.message;

  return res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: responseMessage,
      ...(config.env !== 'production' && { stack: err.stack })
    }
  });
}

module.exports = errorHandler;

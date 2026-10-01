function success(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
}

function error(res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
  const payload = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    }
  };
  return res.status(statusCode).json(payload);
}

module.exports = {
  success,
  error
};

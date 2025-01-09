const errorResponse = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    error: {
      code: statusCode,
      message,
      timestamp: new Date().toISOString(),
    },
  };

  if (details) {
    response.error.details = details;
  }

  // Log the error
  console.error(`[${statusCode}] ${message}`, details || '');

  return res.status(statusCode).json(response);
};

const validationError = (res, errors) => {
  return errorResponse(res, 400, 'Validation failed', errors);
};

const notFoundError = (res, resource) => {
  return errorResponse(res, 404, `${resource || 'Resource'} not found`);
};

const unauthorizedError = (res, message = 'Unauthorized') => {
  return errorResponse(res, 401, message);
};

const forbiddenError = (res, message = 'Forbidden') => {
  return errorResponse(res, 403, message);
};

module.exports = {
  errorResponse,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
};
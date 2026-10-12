class AppError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST', details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const payload = {
    ok: false,
    error: {
      code: err.code || (status === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      message: status === 500 ? 'Internal server error' : err.message,
    },
  };
  if (err.details) payload.error.details = err.details;
  if (status === 500 && process.env.NODE_ENV !== 'production') {
    payload.error.debug = err.message;
  }
  res.status(status).json(payload);
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { AppError, errorHandler, asyncHandler };

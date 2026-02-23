// Gateway error handler middleware
import logger from './logger.js';

const errorHandler = (err, req, res, next) => {
  logger.error('ErrorHandler', `${err.message} on ${req.method} ${req.path}`, err);
  
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    status: statusCode,
    timestamp: new Date().toISOString()
  });
};

export default errorHandler;

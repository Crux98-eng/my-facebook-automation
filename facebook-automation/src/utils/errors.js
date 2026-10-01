class CustomError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends CustomError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class NotFoundError extends CustomError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

class AuthenticationError extends CustomError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends CustomError {
  constructor(message = 'Permission denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class ExternalAPIError extends CustomError {
  constructor(message, provider = 'ExternalService', statusCode = 502, details = null) {
    super(message, statusCode, `${provider.toUpperCase()}_API_ERROR`, details);
    this.provider = provider;
  }
}

class AIProviderError extends ExternalAPIError {
  constructor(message, details = null) {
    super(message, 'AIProvider', 502, details);
  }
}

class FacebookAPIError extends ExternalAPIError {
  constructor(message, details = null) {
    super(message, 'Facebook', 502, details);
  }
}

class DatabaseError extends CustomError {
  constructor(message, details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

module.exports = {
  CustomError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ExternalAPIError,
  AIProviderError,
  FacebookAPIError,
  DatabaseError
};

const logger = require('../config/logger');

async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    backoffFactor = 2,
    shouldRetry = (err) => {
      // Retry on network errors or 5xx HTTP status codes
      if (!err.response) return true;
      const status = err.response.status;
      return status >= 500 && status <= 599;
    }
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      return await fn();
    } catch (err) {
      const isRetryable = shouldRetry(err);
      if (attempt >= maxAttempts || !isRetryable) {
        logger.warn(`Operation failed after ${attempt} attempt(s). Retryable: ${isRetryable}`, { error: err.message });
        throw err;
      }
      logger.info(`Attempt ${attempt} failed. Retrying in ${delay}ms... Error: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }
}

module.exports = { retry };

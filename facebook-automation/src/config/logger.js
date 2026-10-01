const winston = require('winston');
const config = require('./env');

const sensitiveKeys = ['password', 'password_hash', 'access_token', 'accessToken', 'secret', 'apiKey', 'authorization'];

const sanitize = winston.format((info) => {
  if (typeof info === 'object') {
    const sanitizeObj = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObj(obj[key]);
        }
      }
    };
    sanitizeObj(info);
  }
  return info;
});

const logger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    sanitize(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'facebook-automation-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;

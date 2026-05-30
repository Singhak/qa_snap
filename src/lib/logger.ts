import pino from 'pino';

function getLogger() {
  const level = process.env.LOG_LEVEL || 'info';

  if (process.env.NODE_ENV === 'development') {
    try {
      const pretty = require('pino-pretty');
      const stream = pretty({
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      });
      return pino({ level }, stream);
    } catch {
      // Fallback if pino-pretty isn't available
    }
  }

  return pino({ level });
}

const logger = getLogger();

export { logger };

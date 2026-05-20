import pino from 'pino';

const logger = pino({
  // Configure logger based on environment
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined, // In production, pino will default to JSON output
  level: process.env.LOG_LEVEL || 'info', // Default log level to 'info'
});

export { logger };
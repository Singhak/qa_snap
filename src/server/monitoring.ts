type LogLevel = 'info' | 'warn' | 'error';

export function createRequestId() {
  return crypto.randomUUID();
}

export function logApiEvent(args: {
  level?: LogLevel;
  requestId: string;
  route: string;
  message: string;
  details?: Record<string, unknown>;
}) {
  const entry = {
    ts: new Date().toISOString(),
    level: args.level ?? 'info',
    requestId: args.requestId,
    route: args.route,
    message: args.message,
    details: args.details ?? {},
  };

  const line = JSON.stringify(entry);

  if ((args.level ?? 'info') === 'error') {
    console.error(line);
    return;
  }

  if ((args.level ?? 'info') === 'warn') {
    console.warn(line);
    return;
  }

  console.info(line);
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...data,
  };
  const out = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    console.error(out);
  } else {
    console.log(out);
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
  info:  (msg: string, data?: Record<string, unknown>) => log('info',  msg, data),
  warn:  (msg: string, data?: Record<string, unknown>) => log('warn',  msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
};

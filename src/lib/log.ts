export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const enabled =
  process.env.NODE_ENV === 'development' ||
  process.env.ENABLE_VERBOSE_LOGGING === 'true';

function fmt(level: LogLevel, msg: any, ...args: any[]): [any, ...any[]] {
  const prefix = `[FC:${level}]`;
  return [prefix, msg, ...args];
}

export const logger = {
  debug: (msg: any, ...args: any[]) => {
    if (enabled) console.debug(...fmt('debug', msg, ...args));
  },
  info: (msg: any, ...args: any[]) => {
    if (enabled) console.info(...fmt('info', msg, ...args));
  },
  warn: (msg: any, ...args: any[]) => console.warn(...fmt('warn', msg, ...args)),
  error: (msg: any, ...args: any[]) => console.error(...fmt('error', msg, ...args)),
};

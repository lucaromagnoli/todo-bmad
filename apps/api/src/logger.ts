import { pino, type Logger } from 'pino';

export function createLogger(): Logger {
  const isDev = process.env.NODE_ENV !== 'production';
  return pino({
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    ...(isDev
      ? { transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true } } }
      : {}),
  });
}

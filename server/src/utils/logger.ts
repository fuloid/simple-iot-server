import pino, { type Logger } from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty());

// make logger log info set debug min level
logger.level = (process.env.DEBUG && Boolean(process.env.DEBUG)) ? 'debug' : 'info';
logger.debug('Logger initialized with level:', logger.level);

export function createLogger(prefix: string, customLogger?: Logger) {
    if (customLogger) {
        // get the current prefix from the custom logger
        const currentPrefix = customLogger.bindings().msgPrefix || '';

        // if exist, extract the prefix from the current logger with match
        // if prefix exist, then make the new prefix `[${prefix} > ${currentPrefix}]`
        // else make the new prefix `[${prefix}]`
        const prefixMatch = currentPrefix.match(/^\[(.+?)\]/);
        const newPrefix = prefixMatch ? `[${prefix} > ${prefixMatch[1]}] ` : `[${prefix}] `;
        return {
            ...customLogger,
            info: wrap(customLogger, 'info', newPrefix),
            warn: wrap(customLogger, 'warn', newPrefix),
            error: wrap(customLogger, 'error', newPrefix),
            debug: wrap(customLogger, 'debug', newPrefix),
        } satisfies Logger;
    }

    return {
        ...logger,
        info: wrap(logger, 'info', prefix),
        warn: wrap(logger, 'warn', prefix),
        error: wrap(logger, 'error', prefix),
        debug: wrap(logger, 'debug', prefix),
    } satisfies Logger;
}

type ValidLogLevel = 'info' | 'error' | 'debug' | 'warn' | 'trace' | 'fatal';
function wrap(logger: Logger, level: ValidLogLevel, prefix: string): pino.LogFn {
    const logMethod = logger[level] as pino.LogFn;
    // Check if the method is actually a function
    if (typeof logMethod !== 'function') {
        throw new Error(`Invalid logger level: ${level}`);
    }
    
    return function(obj: unknown, ...args: any[]): void {
        if (typeof obj === 'string') {
            logMethod.call(logger, `[${prefix}] ${obj}`, ...args);
        } else {
            logMethod.call(logger, (obj as any), ...args);
        }
    } satisfies pino.LogFn;
}

export default logger;
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty());
export type Logger = pino.Logger & { prefix?: string };

// make logger log info set debug min level
logger.level = (process.env.DEBUG && Boolean(process.env.DEBUG)) ? 'debug' : 'info';
logger.debug('Logger initialized with level:', logger.level);

export function createLogger(prefix: string, customLogger?: Logger) {
    if (customLogger) {
        // get the current prefix from the custom logger
        const currentPrefix = customLogger.prefix || '';

        // if exist, extract the prefix from the current logger with match
        // if prefix exist, then make the new prefix `[${prefix} > ${currentPrefix}]`
        // else make the new prefix `[${prefix}]`]
        const newPrefix = currentPrefix != '' ? `${currentPrefix} > ${prefix}` : `${prefix}`;
        return {
            ...customLogger,
            info: wrap(logger, 'info', newPrefix),
            warn: wrap(logger, 'warn', newPrefix),
            error: wrap(logger, 'error', newPrefix),
            debug: wrap(logger, 'debug', newPrefix),
            prefix: newPrefix,
        } satisfies Logger;
    }

    return {
        ...logger,
        info: wrap(logger, 'info', prefix),
        warn: wrap(logger, 'warn', prefix),
        error: wrap(logger, 'error', prefix),
        debug: wrap(logger, 'debug', prefix),
        prefix,
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
            
            // thx to railway broken logs system, we need to use
            // some hacks to make sure error obj is logged correctly.
            if (process.env.NODE_ENV === 'production' && (args[0] as any) instanceof Error) {
                // inject the error message in the message itself.
                obj = obj + `${(args[0] as Error).message ?? ''}\n${(args[0] as Error).stack}`;
            }

            logMethod.call(logger, `[${prefix}] ${obj}`, ...args);
        } else {
            logMethod.call(logger, (obj as any), ...args);
        }
    } satisfies pino.LogFn;
}

export default logger;
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
        return customLogger.child({ msgPrefix: newPrefix });
    }
    return logger.child({ msgPrefix: `[${prefix}] ` });
}

export default logger;
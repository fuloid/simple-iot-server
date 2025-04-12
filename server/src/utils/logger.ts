import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty());

// make logger log info set debug min level
logger.level = (process.env.DEBUG && Boolean(process.env.DEBUG)) ? 'debug' : 'info';
logger.debug('Logger initialized with level:', logger.level);

export default logger;
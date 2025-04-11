import { Pool } from 'pg';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '@/db/schema';
import logger from '@/utils/logger';

if (!process.env.DATABASE_URL) {
    logger.error('DATABASE_URL is not set in the environment variables.');
    logger.error('Please set it to your database connection string.');
    logger.error('Server will exit...');
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export default db;
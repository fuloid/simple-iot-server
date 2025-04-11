import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import logger from '@/utils/logger';

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db: NodePgDatabase = drizzle(pool);

    logger.info('[Migration] Starting database migration...');
    await migrate(db, { migrationsFolder: './drizzle' });

    logger.info('[Migration] Database migration completed successfully.');
    await pool.end();
}

main();
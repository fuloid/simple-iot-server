import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import logger from '@/utils/logger';

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db: NodePgDatabase = drizzle(pool);

    logger.info('[Migration] Starting database migration...');
    
    // Check if migrations are already applied
    const { rowCount } = await pool.query(`
        SELECT EXISTS (
            SELECT 1 FROM pg_tables 
        );
    `);
    
    if (rowCount && rowCount > 0) {
        logger.info('[Migration] Found existing migrations. Skipped, bye!');
        await pool.end();
        return;
    }

    await migrate(db, { migrationsFolder: './drizzle' });

    logger.info('[Migration] Database migration completed successfully.');
    await pool.end();
}

main();
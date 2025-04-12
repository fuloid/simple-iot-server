import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import logger from '@/utils/logger';

let restart = false;

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db: NodePgDatabase = drizzle(pool);

    logger.info(`[Migration] ${restart ? 'Res' : 'S'}tarting database migration...`);
    
    try {
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
    } catch (error) {
        logger.error('[Migration] Checks error. database might be booting up, retries in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        restart = true; main(); return;
    }
}

main();
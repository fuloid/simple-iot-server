import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { createLogger } from '@/utils/logger';

let restart = false;
const logger = createLogger('Migration');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db: NodePgDatabase = drizzle(pool);

    logger.info(`${restart ? 'Res' : 'S'}tarting database migration...`);
    
    try {
        // Check if migrations are already applied
        const { rowCount } = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_tables 
            );
        `);

        if (rowCount && rowCount > 0) {
            logger.info('Found existing migrations. Skipped, bye!');
            await pool.end();
            return;
        }
    
        await migrate(db, { migrationsFolder: './drizzle' });
    
        logger.info('Database migration completed successfully.');
        await pool.end();
    } catch (error) {
        logger.error('Checks error. database might be still booting up, retries in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        restart = true; main(); return;
    }
}

if (process.env.MQTT_WEB_HOST ?? '' == '') {
    logger.info('');
    logger.info('-------------------------------------------------------------------------------------');
    logger.info('');
    logger.info('  Hey there! It seems that you missed to set MQTT web host server in variables.');
    logger.info('  If you haven\'t set up the MQTT server yet, please go to the');
    logger.info('  EMQX service >> Settings >> Networking then add domain for API gateway');
    logger.info('  (generate or use custom domain), then redeploy the Backend service.');
    logger.info('');
    logger.info('-------------------------------------------------------------------------------------');
    logger.info('');

    // kill the process
    process.exit(1);
}
main();
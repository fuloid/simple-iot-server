import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { createLogger } from '@/utils/logger';
import { count } from 'drizzle-orm';
import { devices } from '@/db/schema';
import { randomUUID } from 'crypto';
import type { Sensors } from '@/utils/database';

let restart = false;
const logger = createLogger('Migration');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db: NodePgDatabase = drizzle(pool);

    logger.info(`${restart ? 'Res' : 'S'}tarting database migration...`);

    try {
        // Check if migrations are already applied
        const { rowCount } = await pool.query('SELECT 1 FROM _drizzle_migrations LIMIT 1;');

        if (rowCount && rowCount > 0) {
            logger.info('Found existing migrations. Skipped, bye!');
            await seedDevice(db);
            await pool.end();
            return;
        }

        await migrate(db, { migrationsFolder: './drizzle' });

        logger.info('Database migration completed successfully.');
        await seedDevice(db);
        await pool.end();
    } catch (error) {
        logger.error('Checks error. database might be still booting up, retries in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        restart = true; main(); return;
    }
}

async function seedDevice(db: NodePgDatabase) {
    // Count how many rows exist
    const res = await db
        .select({ count: count() })
        .from(devices);

    if (Number(res[0]?.count) === 0) {
        await db.insert(devices).values({
            id: randomUUID(),
            last_ping: new Date('1970-01-01T00:00:00.000Z'),
            cache_data: {
                water_temp: 0,
                water_acidity: 0,
                water_turbidity: 0,
                water_level: 0,
                air_temp: 0,
                humidity: 0,
                food_level: 0,
            } satisfies Sensors,
            cache_config: {},
            updated_at: new Date(),
        });
        logger.info('Device seeding completed successfully.');
    } else {
        logger.info('Found existing device in table. Skipped, bye!');
    }
}


main();
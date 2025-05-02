import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { createLogger } from '@/utils/logger';
import { count, sql } from 'drizzle-orm';
import type { DeviceData, Sensors } from '@/types/database/device';

import { devices } from '@/db/schema/devices';
import { configs } from '@/db/schema/configs';

let restart = false;
const logger = createLogger('Migration');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db: NodePgDatabase = drizzle(pool);

    logger.info(`${restart ? 'Res' : 'S'}tarting database migration...`);

    try {
        await checkAndBackupDeviceData(db);

        await new Promise<void>((resolve, reject) => {
            const child = Bun.spawn(['bun', 'drizzle-kit', 'push', '--verbose'], {
                stdout: 'inherit',
                stderr: 'inherit',
            });

            child.exited.then((code) => {
                if (code === 0) resolve();
                else reject(new Error(`Migration failed with exit code ${code}`));
            });
        });

        logger.info('Database migration completed successfully.');
        await seedDevice(db);
        await seedConfig(db);
        await pool.end();
    } catch (error) {
        logger.error('Checks error. database might be still booting up, retries in 5 seconds...');
        console.error(error);
        await new Promise(resolve => setTimeout(resolve, 5000));
        restart = true; main(); return;
    }
}

let deviceData: DeviceData | null = null;
async function checkAndBackupDeviceData(db: NodePgDatabase) {
    try {
        await db.execute(sql`INSERT INTO devices (id, cache_data) VALUES ('1','{"test_only":"Safe to delete"}'`);
        // If the above query succeeds, it means the table exists and we can proceed with the migration.
        await db.execute(sql`DELETE FROM devices WHERE cache_data = '{"test_only":"Safe to delete"}'`);
    } catch (error) {
        if ((error as any).message.toString().includes('invalid input syntax for type uuid: "1"')) {
            // backup the device data
            const data = await db
                .select()
                .from(devices)
                .limit(1)
                .execute();
            if (data.length === 0) return;

            deviceData = {
                last_ping: data[0]!.last_ping,
                cache_data: data[0]!.cache_data as Sensors,
                last_action: data[0]!.last_action,
                cache_config: data[0]!.cache_config,
            }

            // delete the device table
            await db.execute(sql`DROP TABLE IF EXISTS devices`);
        }
        return;
    }
}

async function seedDevice(db: NodePgDatabase) {
    // Count how many rows exist
    const res = await db
        .select({ count: count() })
        .from(devices);

    if (Number(res[0]?.count) === 0) {
        await db.insert(devices).values({
            id: '1',
            last_ping: deviceData?.last_ping ?? new Date('1970-01-01T00:00:00.000Z'),
            cache_data: deviceData?.cache_data ??{
                water_temp: 0,
                water_acidity: 0,
                water_turbidity: 0,
                water_level: 0,
                air_temp: 0,
                humidity: 0,
                food_level: 0,
            } satisfies Sensors,
            last_action: deviceData?.last_action ?? null,
            cache_config: deviceData?.cache_config ?? {},
            updated_at: new Date(),
        });
        logger.info('Device seeding completed successfully.');
    } else {
        logger.info('Found existing device in table. Skipped, bye!');
    }
}

async function seedConfig(db: NodePgDatabase) {
    // Count how many rows exist
    const res = await db
        .select({ count: count() })
        .from(configs);

    if (Number(res[0]?.count) === 0) {
        await db.insert(configs).values({
            id: '1',
            auto_pakan_enabled: false,
            auto_pakan_time: ['07:00', '17:00'],
            histories_enabled: false,
            histories_auto_purge_day: 7,
            alert_enabled: false,
            alert_threshold: {
                acidity: { min: 6, max: 9 },
                turbidity: { min: 0, max: 25 },
                temp: { min: 25, max: 30 },
            },
            updated_at: new Date(),
        });
        logger.info('Config seeding completed successfully.');
    } else {
        logger.info('Found config device in table. Skipped, bye!');
    }
}


main();
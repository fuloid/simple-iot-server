// --- utils/database.ts ---
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export interface Sensors {
    water_temp?: number;
    water_acidity?: number;
    water_turbidity?: number;
    water_level?: number;
    air_temp?: number;
    humidity?: number;
    food_level?: number;
}
export interface DeviceData {
    last_ping?: schema.Device['last_ping'];
    cache_data?: Sensors;
    cache_config?: schema.Device['cache_config'];
}
export type Device = DeviceData & { 
    id: schema.Device['id'], 
    updated_at: schema.Device['updated_at'] 
};

export class Database {
    static device: schema.Device;

    static getDevice = async (): Promise<Device> => {
        const device = await db.query.devices.findFirst();
        Database.device = device!;
        return device! as Device;
    }

    static updateDevice = async (data: DeviceData): Promise<void> => {
        if (!Database.device) await Database.getDevice();
        await db.update(schema.devices)
            .set({ ...data, updated_at: new Date() })
            .where(eq(schema.devices.id, Database.device!.id))
            .execute();
    }

    static updateDevicePing = async (): Promise<void> => {
        await Database.updateDevice({ last_ping: new Date() });
    }

    static updateDeviceSensor = async (name: keyof Sensors, value: number): Promise<void> => {
        if (!Database.device) await Database.getDevice();
        const data = (Database.device.cache_data || {}) as Sensors;
        data[name] = value;
        await Database.updateDevice({ cache_data: data });
    }

    static addActionLog = async (type: schema.ActionLog['type'], metadata?: schema.ActionLog['metadata']): Promise<void> => {
        try {
            await db.insert(schema.action_logs).values({
                id: randomUUID(),
                type,
                metadata,
                created_at: new Date(),
            }).execute();
        } catch (error) {
            return;
        }
    }
}

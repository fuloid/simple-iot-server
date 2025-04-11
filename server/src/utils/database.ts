// --- utils/database.ts ---
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema'; // Adjust path if needed
import { eq } from 'drizzle-orm';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

type DeviceType = 'master' | 'agent';
export const db = drizzle(pool, { schema });

export class Database {
    static async getDeviceByUUID(uuid: string, type?: DeviceType): Promise<((schema.MasterDevice & { type: 'master' }) | (schema.AgentDevice & { type: 'agent' })) | null> {
        if (type !== 'agent') {
            const result = await db.query.master_devices.findFirst({
                where: eq(schema.master_devices.id, uuid),
            });
            if (result) return { ...result, type: 'master' };
        }

        if (type !== 'master') {
            const result = await db.query.agent_devices.findFirst({
                where: eq(schema.agent_devices.id, uuid),
            });
            if (result) return { ...result, type: 'agent' };
        }
        return null;
    }

    static async listAgentDevices(masterDeviceId: string) {
        const result = await db.query.master_agent_devices.findMany({
            where: eq(schema.master_agent_devices.master_device_id, masterDeviceId),
            columns: { agent_device_id: true },
        });
        return result.map((device) => device.agent_device_id);
    }

    static async getDeviceMaster(uuid: string) {
        const result = await db.query.master_agent_devices.findFirst({
            where: eq(schema.master_agent_devices.agent_device_id, uuid),
            columns: { master_device_id: true },
        });
        if (result) return result.master_device_id;
        return null;
    }

    static async registerMasterDevice(uuid: string) {
        return await db.insert(schema.master_devices).values({
            id: uuid,
            created_at: new Date(),
            updated_at: new Date(),
        }).onConflictDoNothing().returning();
    }

    static async registerAgentDevice(uuid: string) {
        return await db.insert(schema.agent_devices).values({
            id: uuid,
            created_at: new Date(),
            updated_at: new Date(),
        }).onConflictDoNothing().returning();
    }

    static async connectAgentDevice(uuid: string, masterDeviceId: string) {
        return await db.insert(schema.master_agent_devices).values({
            master_device_id: masterDeviceId,
            agent_device_id: uuid,
        }).onConflictDoNothing().returning();
    }

    static async isDeviceRegistered(uuid: string, type?: DeviceType): Promise<{ result: boolean; type?: DeviceType }> {
        const deviceType = type ?? (await this.getDeviceByUUID(uuid))?.type ?? null;
        if (!deviceType) return { result: false };

        if (deviceType === 'master') {
            const result = await db.query.master_devices.findFirst({
                where: eq(schema.master_devices.id, uuid),
                columns: { owner_id: true },
            });
            if (result?.owner_id !== null && result?.owner_id !== undefined) return {
                result: true,
                type: 'master',
            };
        }
        
        if (deviceType === 'agent') {
            const result = await db.query.master_agent_devices.findFirst({
                where: eq(schema.master_agent_devices.agent_device_id, uuid)
                });
            if (result) return {
                result: true,
                type: 'agent',
            };
        }
        return { result: false };
    }

    static async updateDeviceToken(uuid: string, token: string, expiresAt: Date, type?: DeviceType) {
        const deviceType = type ?? (await this.getDeviceByUUID(uuid))?.type ?? null;
        if (!deviceType) return null;

        const prop = deviceType === 'master' ? schema.master_devices : schema.agent_devices;
        return db.update(prop)
            .set({
                token,
                token_expires_at: expiresAt,
                updated_at: new Date(),
            })
            .where(eq(prop.id, uuid))
            .returning();
    }

    static async getDeviceToken(uuid: string, type?: DeviceType) {
        const deviceType = type ?? (await this.getDeviceByUUID(uuid))?.type ?? null;
        if (!deviceType) return null;

        const prop = deviceType === 'master' ? db.query.master_devices : db.query.agent_devices;
        const scheme = deviceType === 'master' ? schema.master_devices : schema.agent_devices;
        const result = await prop.findFirst({
            where: eq(scheme.id, uuid),
            columns: {
                token: true,
                token_expires_at: true,
            },
        });

        if (result) return { ...result, type: deviceType };
        return null;
    }

    static async updateDevicePing(uuid: string, type?: DeviceType) {
        const deviceType = type ?? (await this.getDeviceByUUID(uuid))?.type ?? null;
        if (!deviceType) return null;

        const prop = deviceType === 'master' ? schema.master_devices : schema.agent_devices;
        return db.update(prop)
            .set({ last_ping_at: new Date() })
            .where(eq(prop.id, uuid));
    }
}

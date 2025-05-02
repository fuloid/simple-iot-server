// --- utils/database.ts ---
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
// import * as schema from '@/db/schema';
import { eq, lte } from 'drizzle-orm';
import { randomUUID } from 'crypto';

import schema from '@/db/schema';
import * as actionLogs from '@/db/schema/action_logs';
import * as alerts from '@/db/schema/alerts';
import * as histories from '@/db/schema/histories';

import { titles as ActionLogTitles, type ActionLogItem } from '@/types/database/activity_log';
import type { Config as ConfigType } from '@/types/database/config';
import type { Device as DeviceType, DeviceData, Sensors } from '@/types/database/device';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export class Config {
    static config: ConfigType | null = null;

    static getAllConfig = async (force: boolean = false): Promise<ConfigType> => {
        if (!Config.config || force) {
            if (Config.config) return Config.config;
            const config = await db.query.configs.findFirst();
            Config.config = {
                auto_pakan_enabled: config!.auto_pakan_enabled,
                auto_pakan_time: config!.auto_pakan_time as ConfigType['auto_pakan_time'],
                histories_enabled: config!.histories_enabled,
                histories_auto_purge_day: config!.histories_auto_purge_day as ConfigType['histories_auto_purge_day'],
                alert_enabled: config!.alert_enabled,
                alert_threshold: config!.alert_threshold as ConfigType['alert_threshold'],
            };
        };

        return Config.config!;
    }

    static getConfig = <K extends keyof ConfigType>(key: K): ConfigType[K] => {
        return Config.config![key];
    }

    static updateConfig = async (data: Partial<ConfigType>): Promise<void> => {
        if (!Config.config) await Config.getAllConfig();
        await db.update(schema.configs)
            .set({ ...data, updated_at: new Date() })
            .where(eq(schema.configs.id, '1'))
            .execute();
    }
}

export class Device {
    static device: DeviceType | null = null;

    static getDevice = async (): Promise<DeviceType> => {
        if (!Device.device) {
            const device = await db.query.devices.findFirst();
            Device.device = {
                last_ping: device!.last_ping,
                cache_data: device!.cache_data as DeviceType['cache_data'],
                last_action: device!.last_action,
                cache_config: device!.cache_config as DeviceType['cache_config'],
                updated_at: device!.updated_at,
            };
        }

        return Device.device!;
    }

    static updateDevice = async (data: Partial<DeviceData>): Promise<void> => {
        await db.update(schema.devices)
            .set({ ...data, updated_at: new Date() })
            .where(eq(schema.devices.id, '1'))
            .execute();

        Device.getDevice();
    }

    static updateDevicePing = async (): Promise<void> => {
        await Device.updateDevice({ last_ping: new Date() });
    }

    static updateDeviceSensor = async (name: keyof Sensors, value: number): Promise<void> => {
        if (!Device.device) await Device.getDevice();
        const data = (Device.device?.cache_data || {}) as Sensors;
        data[name] = value;
        History.addHistory(data);
        await Device.updateDevice({ cache_data: data });
    }

    static updateDeviceAction = async (done: boolean = false): Promise<void> => {
        await Device.updateDevice({ last_action: done ? null : new Date() });
    }
}

export class Alert {
    static getAlerts = async () => {
        return await db.query.alerts.findMany();
    }

    static addAlert = async (data: alerts.Alert) => {
        await db.insert(schema.alerts).values(data).execute();
    }

    static acknowledgeAlert = async (id: string) => {
        await db.update(schema.alerts)
            .set({ ack: true, updated_at: new Date() })
            .where(eq(schema.alerts.id, id))
            .execute();
    }
}

export class History {
    static lastUpdate: Date | null = null;
    static lastCleaning: Date | null = null;

    static getHistories = async (from: Date, to: Date, page: number = 1, limit: number = 50) => {
        limit = limit > 50 ? 50 : limit;
        const data = await db.query.histories.findMany({
            where: (histories, { and, gte, lte }) => and(
            gte(histories.created_at, from),
            lte(histories.created_at, to)
            ),
            limit, offset: (page - 1) * limit,
            orderBy: (histories, { desc }) => [desc(histories.created_at)],
        });
        return data.map(history => ({
            ...history,
            cache_data: history.cache_data as Sensors
        }));
    }

    static periodicPurge = async (force: boolean = false) => {
        if (Config.getConfig('histories_enabled') !== true) return;
        if (History.lastCleaning && (new Date().getTime() - History.lastCleaning.getTime()) < (force ? 5*6e4 : 36e5)) return;
        const day = Config.getConfig('histories_auto_purge_day');

        db.delete(schema.histories).where(
            lte(schema.histories.created_at, new Date(Date.now() - (day * 24 * 60 * 6e4)))
        ).execute();

        History.lastCleaning = new Date();
    }

    static addHistory = async (data: Sensors) => {
        if (Config.getConfig('histories_enabled') !== true) return;
        if (History.lastUpdate && (new Date().getTime() - History.lastUpdate.getTime()) < 6e4) return;
        //this.periodicPurge();

        await db.insert(schema.histories).values({
            id: randomUUID(),
            cache_data: data as histories.History['cache_data'],
            created_at: new Date(),
        }).execute();
    }
}

export class ActivityLog {
    static getActionLogs = async (): Promise<ActionLogItem[]> => {
        const data = await db.query.action_logs.findMany();
        return data.map((item) => {
            return {
                id: item.id,
                type: item.type,
                title: ActionLogTitles[item.type],
                metadata: item.metadata,
                created_at: new Date(item.created_at).toISOString(),
            } satisfies ActionLogItem;
        });
    }

    static addActionLog = async (type: actionLogs.ActionLog['type'], metadata?: actionLogs.ActionLog['metadata']): Promise<void> => {
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

// cheating to get the config early asap
Config.getAllConfig();
setInterval(History.periodicPurge, 36e5); // every hour

const Database = { Config, Device, Alert, History, ActivityLog };
export default Database;
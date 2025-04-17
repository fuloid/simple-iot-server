// --- controllers/mqtt.ts ---
import { Hono, type Context } from 'hono';
import { Database } from '@/utils/database';
import { createLogger } from '@/utils/logger';
import type { HonoContext } from '@/server';
import client from '@/utils/mqtt';

const app = new Hono();
const logger = createLogger('API');

const actions = [
    'food_refill', 
    'water_refill', 
    'water_drain'
];

app.get('/online', async (c: Context<HonoContext>) => {
    let { last_ping } = await Database.getDevice();
    let online = (last_ping && (Date.now() - new Date(last_ping).getTime()) < 30000) || false;

    return c.json({
        success: true,
        code: 'OK',
        message: `Device is ${online ? "online" : "offline"}.`,
        data: {
            online,
            last_ping: last_ping ? new Date(last_ping).toISOString() : null,
        }
    });
});

app.get('/sensors', async (c: Context<HonoContext>) => {
    const { cache_data } = await Database.getDevice();
    if (!cache_data) {
        return c.json({
            success: false,
            code: 'NO_DATA',
            message: 'No sensor data available.',
        }, 410);
    }

    return c.json({
        success: true,
        code: 'OK',
        message: 'Sensor data retrieved successfully.',
        data: cache_data,
    });
});

app.post('/action', async (c: Context<HonoContext>) => {
    const { action } = await c.req.json() as { action: string, value: any };
    if (!action || !actions.includes(action)) {
        return c.json({
            success: false,
            code: 'INVALID_ACTION',
            message: 'Invalid action.',
        }, 400);
    }
    
    let { last_ping } = await Database.getDevice();
    let online = (last_ping && (Date.now() - new Date(last_ping).getTime()) < 30000) || false;

    if (!online) {
        return c.json({
            success: false,
            code: 'DEVICE_OFFLINE',
            message: 'Device is offline.',
        }, 503);
    }

    client?.publish(`device/remote`, action, { qos: 1, retain: true });
    Database.addActionLog('user_action', { action });
    logger.debug(`Action "${action}" sent to device.`);

    return c.json({
        success: true,
        code: 'OK',
        message: `Action "${action}" sent to device.`,
    });
});

export default app;

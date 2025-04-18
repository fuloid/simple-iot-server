// --- controllers/mqtt.ts ---
import { OpenAPIHono } from '@hono/zod-openapi';
import { type Context } from 'hono';
import { Database } from '@/utils/database';
import { createLogger } from '@/utils/logger';
import type { HonoContext } from '@/server';
import { getClient } from '@/utils/mqtt';

import LoginRoute from '@/types/api/openapi/login';
import OnlineRoute from '@/types/api/openapi/online';
import SensorsRoute from '@/types/api/openapi/sensors';
import ActionRoute from '@/types/api/openapi/action';

const app = new OpenAPIHono();
const logger = createLogger('API');

const actions = [
    'food_refill',
    'water_refill',
    'water_drain'
];

// @ts-expect-error
app.openapi(LoginRoute, async (c: Context<HonoContext>) => {
    return c.json({
        success: true,
        code: 'OK',
        message: 'Login successful.',
    }, 200);
});

// @ts-expect-error
app.openapi(OnlineRoute, async (c: Context<HonoContext>) => {
    try {
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
        }, 200);
    } catch (err) {
        logger.error('Error checking device status:', err);
        return c.json({
            success: false,
            code: 'ERROR',
            message: 'Error checking device status.',
        }, 500);
    }
});

// @ts-expect-error
app.openapi(SensorsRoute, async (c: Context<HonoContext>) => {
    try {
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
    } catch (err) {
        logger.error('Error retrieving sensor data:', err);
        return c.json({
            success: false,
            code: 'ERROR',
            message: 'Error retrieving sensor data.',
        }, 500);
    }
});

// @ts-expect-error
app.openapi(ActionRoute, async (c: Context<HonoContext>) => {
    try {
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

        getClient().publish(`device/remote`, action, { qos: 1, retain: true });
        Database.addActionLog('user_action', { action });
        logger.debug(`Action "${action}" sent to device.`);

        return c.json({
            success: true,
            code: 'OK',
            message: `Action successfully sent to device.`,
        });
    } catch (err) {
        logger.error('Error sending action to device:', err);
        return c.json({
            success: false,
            code: 'ERROR',
            message: 'Error sending action to device.',
        }, 500);
    }
});

export default app;

// --- controllers/mqtt.ts ---
import { OpenAPIHono } from '@hono/zod-openapi';
import { type Context } from 'hono';
import Database from '@/utils/database';
import { createLogger } from '@/utils/logger';
import type { HonoContext } from '@/server';
import { getClient } from '@/utils/mqtt';

import LoginRoute from '@/types/api/openapi/login';
import OnlineRoute from '@/types/api/openapi/online';
import SensorsRoute from '@/types/api/openapi/sensors';
import { getRoute as ActionGetRoute, postRoute as ActionPostRoute } from '@/types/api/openapi/action';
import actions from '@/types/api/schema/actions';

const app = new OpenAPIHono();
const logger = createLogger('API');

export let lastAction: number | null = null;

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
        let { last_ping } = await Database.Device.getDevice();
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
        const { cache_data } = await Database.Device.getDevice();
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
app.openapi(ActionGetRoute, async (c: Context<HonoContext>) => {
    const { last_ping } = await Database.Device.getDevice();
    const online = (last_ping && (Date.now() - new Date(last_ping).getTime()) < 30000) || false;
    const running = lastAction && (Date.now() - lastAction) < 15e3;

    const finalActions = Object.keys(actions).reduce((acc, key) => {
        acc[key] = { 
            ...actions[key], 
            enabled: online && !running 
        } as (typeof actions)[keyof typeof actions];
        return acc;
    }, {} as typeof actions);

    return c.json({
        success: true,
        code: 'OK',
        message: 'Action list fetched successfully.',
        data: finalActions
    }, 200);
});

// @ts-expect-error
app.openapi(ActionPostRoute, async (c: Context<HonoContext>) => {
    try {
        let { action } = await c.req.json() as { action: string, value: any };
        action = action.toLowerCase();
        if (!action || !(Object.keys(actions)).includes(action) || !actions[action]?.enabled) {
            return c.json({
                success: false,
                code: 'INVALID_ACTION',
                message: 'Invalid action.',
            }, 400);
        }

        const { last_ping } = await Database.Device.getDevice();
        const online = (last_ping && (Date.now() - new Date(last_ping).getTime()) < 30000) || false;

        if (!online) {
            lastAction = null;
            return c.json({
                success: false,
                code: 'ACTION_UNAVAILABLE',
                message: 'Device is offline.',
            }, 503);
        }

        if (lastAction && (Date.now() - lastAction) < 15e3) {
            return c.json({
                success: false,
                code: 'ACTION_UNAVAILABLE',
                message: 'Another action is still running.',
            }, 503);
        }

        getClient().publish(`device/remote`, action, { qos: 1, retain: true });
        Database.ActivityLog.addActionLog('user_send_action', { action });
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

// --- controllers/auth.ts ---
import { Hono } from 'hono';
import { Database } from '../utils/database';
import Token from '../utils/token';
import { createLogger } from '@/utils/logger';

const app = new Hono();
const logger = createLogger('Auth');

app.get('/devices/request', async (c) => {
    const uuid = c.req.query('uuid');
    const authHeader = c.req.header('authorization') || '';
    const bearerToken = authHeader.replace('Bearer ', '').trim();

    if (!uuid || !bearerToken) {
        logger.debug('Missing UUID or Bearer token in request.');
        return c.json({ c: 'FORBIDDEN' }, 403);
    }

    const device_type = (() => {
        if (bearerToken === process.env.DEVICE_MASTER_SECRET_KEY) return 'master';
        else if (bearerToken === process.env.DEVICE_AGENT_SECRET_KEY) return 'agent';
        return null;
    })();

    // Simulated auth check - replace this with real logic based on your token/secret
    if (device_type === null) {
        logger.debug('Invalid bearer token');
        return c.json({ c: 'FORBIDDEN' }, 403);
    }

    try {
        // Check if device exists
        const exists = await Database.getDeviceByUUID(uuid);
        if (!exists) {
            if (!device_type) return c.json({ c: 'ERROR' }, 404);
            logger.debug('Device not found, registering new');
            
            if (device_type === 'master') await Database.registerMasterDevice(uuid);
            else if (device_type === 'agent') await Database.registerAgentDevice(uuid);
            else return c.json({ c: 'ERROR' }, 400);
        }

        const isRegistered = await Database.isDeviceRegistered(uuid);
        if (!isRegistered.result) {
            logger.debug('Device exists but is not registered with ' + (isRegistered.type === 'master' ? 'user' : 'master') + '.');
            return c.json({ c: 'NOT_REGISTERED' }, 401);
        }

        const result = await Token.getDeviceToken(uuid);
        return c.json(result);
    } catch (err) {
        logger.error('Unexpected error:', err);
        return c.json({ c: 'ERROR' }, 500);
    }
});

export default app;

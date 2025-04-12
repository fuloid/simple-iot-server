// --- controllers/mqtt.ts ---
import { Hono } from 'hono';
import { Database } from '@/utils/database';
import Token from '@/utils/token';
import logger from '@/utils/logger';

const app = new Hono();

// Serve MQTT broker address to the device
app.get('/', async (c) => {
    const mqttHost = process.env.MQTT_HOST || '127.0.0.1:1833';
    return c.json({ c: 'OK', ip: mqttHost });
});

// EMQX HTTP Auth Plugin endpoint
app.post('/auth', async (c) => {

    // Debug get raw body
    const rawBody = c.body;
    logger.debug('[MQTT] Raw body:', rawBody);

    const { username: uuid, password, token } = await c.req.json() as { username: string|null, password: string|null, token: string|null };
    if (!uuid || !password || !token) {
        logger.debug('[MQTT] Missing username, password or token');
        return c.json({ result: 'deny' });
    }

    if (token !== process.env.MQTT_SECRET_KEY) {
        logger.warn('[MQTT] Illegal access attempt with token:', token);
        return c.json({ result: 'deny' });
    }

    try {

        // Check if username is "systemctl"
        if (uuid === 'systemctl' && password === process.env.MQTT_SECRET_KEY) {
            logger.info('[MQTT] System authentication successful.');
            return c.json({
                result: 'allow',
                // expire_at: Date.now() + 24 * 60 * 60 * 1000,
                // acl: [
                //     { permission: 'allow', action: 'all', topic: `device/#/ping` },
                //     { permission: 'allow', action: 'all', topic: `device/#/data` },
                //     { permission: 'deny', action: 'all', topic: `#` },
                // ]
            });
        }


        // check if username type is uuid
        if (!uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
            logger.debug('[MQTT] Ignoring non-UUID login.');
            return c.json({ result: 'ignore' });
        }

        const result = await Database.getDeviceToken(uuid);
        if (!result) {
            logger.debug('[MQTT] Device not found:', uuid);
            return c.json({ result: 'deny' });
        }

        const { token, token_expires_at, type } = result;
        if (!token || token !== password || token_expires_at!.getTime() < Date.now()) {
            logger.debug('[MQTT] Token mismatch or expired');
            return c.json({ result: 'deny' });
        }

        logger.info('[MQTT] Authentication successful for', uuid);

        const acl = [
            // allow topic `device/${uuid}/#` for publish and subscribe
            // deny all other topics
            { permission: 'allow', action: 'all', topic: `device/${uuid}/ping` },
            { permission: 'allow', action: 'all', topic: `device/${uuid}/data` },
            { permission: 'deny', action: 'all', topic: `#` },
        ];

        if (type === 'master') {
            const agentDevices = await Database.listAgentDevices(uuid);
            if (agentDevices.length > 0) {
                for (const agentDeviceId of agentDevices) {
                    acl.unshift({ permission: 'allow', action: 'all', topic: `device/${agentDeviceId}/ping` });
                    acl.unshift({ permission: 'allow', action: 'all', topic: `device/${uuid}/data/${agentDeviceId}` });
                }
            }
        } else {
            const masterDeviceId = await Database.getDeviceMaster(uuid);
            if (masterDeviceId) {
                acl.unshift({ permission: 'allow', action: 'all', topic: `device/${masterDeviceId}/ping` });
                acl.unshift({ permission: 'allow', action: 'all', topic: `device/${masterDeviceId}/data/${uuid}` });
            }
        }

        return c.json({
            result: 'allow',
            // expire based on token expiration time, or max 1 day
            expire_at: Math.min(Date.now() + 24 * 60 * 60 * 1000, new Date(token_expires_at!).getTime()),
            acl
        });
    } catch (err) {
        logger.error('[MQTT] Unexpected error:', err);
        return c.json({ result: 'deny' });
    }
});

export default app;

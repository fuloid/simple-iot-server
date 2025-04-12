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

    const { clientid, username: uuid, password, token } = await c.req.json() as { clientid: string | null, username: string | null, password: string | null, token: string | null };
    if (!clientid || !uuid || !password || !token) {
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

            const acl = [
                { permission: 'allow', action: 'all', topic: `device/+/ping` },
                { permission: 'allow', action: 'all', topic: `device/+/data` },
                { permission: 'deny', action: 'all' },
            ];

            setTimeout(() => subscribeTopics(clientid, acl), 500);
            return c.json({
                result: 'allow',
                expire_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                acl
            });
        }

        // check if username type is uuid
        const match = uuid.match(/^(\w+)_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);

        if (!match || match.length !== 3) {
            logger.debug('[MQTT] Ignoring invalid login. UUID:', uuid);
            return c.json({ result: 'ignore' });
        }

        const role = (match[1] as string).toLowerCase(); // e.g., device, user, system
        const id = (match[2] as string).toLowerCase();   // the actual UUID

        if (role === 'device') {
            const result = await Database.getDeviceToken(id);
            if (!result) {
                logger.debug('[MQTT] Device not found:', id);
                return c.json({ result: 'deny' });
            }

            const { token, token_expires_at, type } = result;
            if (!token || token !== password || token_expires_at!.getTime() < Date.now()) {
                logger.debug('[MQTT] Token mismatch or expired');
                return c.json({ result: 'deny' });
            }

            logger.info('[MQTT] Auth successful for device', id);

            const acl = [
                { permission: 'allow', action: 'all', topic: `device/${id}/ping` },
                { permission: 'allow', action: 'all', topic: `device/${id}/data` },
                { permission: 'deny', action: 'all' },
            ];

            if (type === 'master') {
                const agentIds = await Database.listAgentDevices(id);
                for (const agentId of agentIds) {
                    acl.push({ permission: 'allow', action: 'all', topic: `device/${agentId}/ping` });
                    acl.push({ permission: 'allow', action: 'all', topic: `device/${agentId}/master` });
                }
            } else if (type === 'agent') {
                const masterId = await Database.getDeviceMaster(id);
                if (masterId) {
                    acl.push({ permission: 'allow', action: 'all', topic: `device/${id}/master` });
                    acl.push({ permission: 'allow', action: 'all', topic: `device/${masterId}/ping` });
                }
            }

            setTimeout(() => subscribeTopics(clientid, acl), 500);
            return c.json({
                result: 'allow',
                client_attrs: { role, type },
                expire_at: Math.floor(Math.min(Date.now() + 24 * 60 * 60 * 1000, new Date(token_expires_at!).getTime()) / 1000),
                acl
            });
        } else {
            logger.debug('[MQTT] Invalid role:', role);
            return c.json({ result: 'deny' });
        }
    } catch (err) {
        logger.error('[MQTT] Unexpected error:', err);
        return c.json({ result: 'deny' });
    }
});

const subscribeTopics = async (clientid: string, acl: { permission: string, action: string, topic?: string }[]) => {
    const topics = acl.filter((item) => item.permission === 'allow' && (item.action === 'subscribe' || item.action === 'all') && item.topic).map((item) => ({ topic: item.topic }));
    if (topics.length > 0) {
        // fetch MQTT_HOST /api/v5/clients/systemctl/subscribe/bulk
        await fetch(`https://${process.env.MQTT_WEB_HOST}/api/v5/clients/${clientid}/subscribe/bulk`, {
            headers: {
                Authorization: `Basic ${btoa(`systemctl:${process.env.MQTT_SECRET_KEY}`)}`,
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(topics),
        });
        logger.info(`[MQTT] Client ${clientid} subscribed to topics: ${topics.map((item) => item.topic).join(', ')}`);
    }
}

export default app;

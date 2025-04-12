// --- controllers/mqtt.ts ---
import { Hono, type Context } from 'hono';
import { Database } from '@/utils/database';
import { createLogger } from '@/utils/logger';
import type { HonoContext } from '@/server';

const app = new Hono();
const logger = createLogger('MQTT');

// Serve MQTT broker address to the device
app.get('/', async (c) => {
    const mqttHost = process.env.MQTT_HOST!;
    return c.json({ c: 'OK', ip: mqttHost });
});

// EMQX HTTP Auth Plugin endpoint
app.post('/auth', async (c: Context<HonoContext>) => {

    const { clientid, username, password, token } = await c.req.json() as { clientid: string | null, username: string | null, password: string | null, token: string | null };
    if (!clientid || !username || !password || !token) {
        logger.debug('Missing username, password or token');
        return c.json({ result: 'deny' });
    }

    if (token !== process.env.MQTT_SECRET_KEY) {
        logger.warn('Illegal access attempt with token:', token);
        return c.json({ result: 'deny' });
    }

    try {

        // Check if username is "systemctl"
        if (username === 'systemctl' && password === process.env.MQTT_SECRET_KEY) {
            logger.info('System authentication successful.');

            const acl = [
                { permission: 'allow', action: 'all', topic: `device/+/ping` },
                { permission: 'allow', action: 'all', topic: `device/+/data` },
            ];

            setTimeout(() => subscribeTopics(clientid, acl), 500);
            return c.json({
                result: 'allow',
                expire_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                acl
            });
        }

        // check if username type is uuid
        const match = username.match(/^(\w+)_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);

        if (!match || match.length !== 3) {
            logger.debug('Ignoring invalid login. UUID:', username);
            return c.json({ result: 'ignore' });
        }

        const role = (match[1] as string).toLowerCase(); // e.g., device, user, system
        const uuid = (match[2] as string).toLowerCase();   // the actual UUID

        if (role === 'device') {
            return await handleDeviceAuth(c, clientid, uuid, password);
        } else if (role === 'user') {
            // not implemented yet
            logger.debug('User authentication not implemented yet:', uuid);
            return c.json({ result: 'deny' });
        } else {
            logger.debug('Invalid role:', role);
            return c.json({ result: 'deny' });
        }
    } catch (err) {
        logger.error('Unexpected error:', err);
        return c.json({ result: 'deny' });
    }
});

const handleDeviceAuth = async (c: Context<HonoContext>, clientid: string, uuid: string, password: string) => {
    const result = await Database.getDeviceToken(uuid);
    if (!result) {
        logger.debug('Device not found:', uuid);
        return c.json({ result: 'deny' });
    }

    const { token, token_expires_at, type } = result;
    if (!token || token !== password || token_expires_at!.getTime() < Date.now()) {
        logger.debug('Device token mismatch or expired');
        return c.json({ result: 'deny' });
    }

    logger.info('Auth successful for device', uuid);

    const acl = [
        { permission: 'allow', action: 'all', topic: `device/${uuid}/ping` },
        { permission: 'allow', action: 'all', topic: `device/${uuid}/data` },
    ];

    if (type === 'master') {
        const agentIds = await Database.listAgentDevices(uuid);
        for (const agentId of agentIds) {
            acl.push({ permission: 'allow', action: 'all', topic: `device/${agentId}/ping` });
            acl.push({ permission: 'allow', action: 'all', topic: `device/${agentId}/master` });
        }
    } else if (type === 'agent') {
        const masterId = await Database.getDeviceMaster(uuid);
        if (masterId) {
            acl.push({ permission: 'allow', action: 'all', topic: `device/${uuid}/master` });
            acl.push({ permission: 'allow', action: 'all', topic: `device/${masterId}/ping` });
        }
    }

    setTimeout(() => subscribeTopics(clientid, acl), 500);
    return c.json({
        result: 'allow',
        client_attrs: { role: 'device', type },
        expire_at: Math.floor(Math.min(Date.now() + 24 * 60 * 60 * 1000, new Date(token_expires_at!).getTime()) / 1000),
        acl
    });
}

const subscribeTopics = async (clientid: string, acl: { permission: string, action: string, topic?: string }[]) => {
    const topics = acl.filter((item) => item.permission === 'allow' && (item.action === 'subscribe' || item.action === 'all') && item.topic).map((item) => ({ topic: item.topic }));
    if (topics.length > 0) {
        // fetch MQTT_HOST /api/v5/clients/systemctl/subscribe/bulk
        const response = await fetch(`https://${process.env.MQTT_WEB_HOST}/api/v5/clients/${clientid}/subscribe/bulk`, {
            headers: {
                Authorization: `Basic ${btoa(`systemctl:${process.env.MQTT_SECRET_KEY}`)}`,
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(topics),
        });
        if (response.ok) logger.info(`Client ${clientid} subscribed to topics: ${topics.map((item) => item.topic).join(', ')}`);
    }
}

export default app;

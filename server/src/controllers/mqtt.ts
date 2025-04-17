// --- controllers/mqtt.ts ---
import { Hono, type Context } from 'hono';
import { Database } from '@/utils/database';
import { createLogger } from '@/utils/logger';
import type { HonoContext } from '@/server';
import { resetAndReattempt } from '@/utils/mqtt';

const app = new Hono();
const logger = createLogger('MQTT');

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
                { permission: 'allow', action: 'all', topic: `device/ping` },
                { permission: 'allow', action: 'all', topic: `device/remote` },
                { permission: 'allow', action: 'all', topic: `device/sensors/+` },
            ];

            setTimeout(() => subscribeTopics(clientid, acl), 300);
            return c.json({
                result: 'allow',
                expire_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                acl
            });
        }

        // Auth check if user/device valid
        const user = username.toLowerCase();
        if (user === process.env.APP_USERNAME && password === process.env.APP_PASSWORD) {
            logger.info('User authentication successful.');
            const acl = [
                { permission: 'allow', action: 'subscribe', topic: `device/ping` },
                { permission: 'allow', action: 'subscribe', topic: `device/remote` },
                { permission: 'allow', action: 'subscribe', topic: `device/sensors/+` },
            ];

            setTimeout(() => subscribeTopics(clientid, acl), 300);
            Database.addActionLog('user_auth');
            return c.json({
                result: 'allow',
                expire_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                acl
            });
        
        } else if (user === process.env.DEV_USERNAME && password === process.env.DEV_PASSWORD) {
            logger.info('Device authentication successful.');
            const acl = [
                { permission: 'allow', action: 'all', topic: `device/ping` },
                { permission: 'allow', action: 'subscribe', topic: `device/remote` },
                { permission: 'allow', action: 'publish', topic: `device/sensors/+` },
            ];

            setTimeout(() => subscribeTopics(clientid, acl), 300);
            Database.addActionLog('device_auth');
            return c.json({
                result: 'allow',
                expire_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                acl
            });
        
        } else {
            logger.debug('Invalid connection.');
            return c.json({ result: 'deny' });
        }

    } catch (err) {
        logger.error('Unexpected error:', err);
        return c.json({ result: 'deny' });
    }
});

const subscribeTopics = async (clientid: string, acl: { permission: string, action: string, topic?: string }[]) => {
    resetAndReattempt();
    const topics = acl.filter((item) => item.permission === 'allow' && (item.action === 'subscribe' || item.action === 'all') && item.topic).map((item) => ({ topic: item.topic, nl: 1 }));
    if (topics.length > 0) {
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

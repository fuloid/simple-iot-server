// --- server.ts ---
import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { serve } from 'bun';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import Token from '@/utils/token';
import auth from '@/controllers/auth';
import mqtt from '@/controllers/mqtt';
import { connectMQTT } from './utils/mqtt';

export type HonoContext = { 
    Variables: { 
        device_id?: string 
    } 
};
const app = new Hono<HonoContext>();

// Allow all CORS
app.use('*', cors());

// Rate limiting for /auth/* and /mqtt/auth
const authRateLimit = rateLimiter({
    windowMs: 5000,
    limit: 5,
    keyGenerator: (c) =>
        c.req.header('x-forwarded-for') ||
        c.req.raw.headers.get('x-real-ip') ||
        'ip',
})
app.use('/auth/*', authRateLimit);
app.use('/mqtt/auth', authRateLimit);

// Global rate limit for everyone else
app.use('*', rateLimiter({
    windowMs: 30000,
    limit: 200,
    keyGenerator: (c) =>
        c.req.header('x-forwarded-for') ||
        c.req.raw.headers.get('x-real-ip') ||
        'ip',
}));

// Bearer auth middleware
const deviceMiddleware = async (c: Context<HonoContext>, next: Next) => {

    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ c: 'ERROR' }, 401);
    }

    const token = authHeader.slice(7);
    const result = await Token.verify(token);
    if (result.c !== 'OK') {
        return c.json({ c: 'ERROR' }, 401);
    }

    c.set('device_id', result.device_id);
    await next();
};
app.use('/mqtt', deviceMiddleware);

// Route mounts
app.route('/auth', auth);
app.route('/mqtt', mqtt);

// Initialize mqtt client
connectMQTT();

// Start Bun server
serve({
    fetch: app.fetch,
    port: process.env.PORT || '3000',
});

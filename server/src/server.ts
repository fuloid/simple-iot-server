// --- server.ts ---
import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { serve } from 'bun';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import mqtt from '@/controllers/mqtt';
import api from '@/controllers/api';
import { connectMQTT } from './utils/mqtt';

export type HonoContext = { 
    Variables: { 
        device_id?: string 
    } 
};
const app = new Hono<HonoContext>();

// Allow all CORS
app.use('*', cors());

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
const appMiddleware = async (c: Context<HonoContext>, next: Next) => {

    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return c.json({ 
            success: false,
            code: 'UNAUTHORIZED', 
            message: 'Missing or invalid authorization.'
        }, 401);
    }

    const token = atob(authHeader.slice(6));
    if (token !== `${process.env.APP_USERNAME}:${process.env.APP_PASSWORD}`) {
        return c.json({ 
            success: false,
            code: 'UNAUTHORIZED', 
            message: 'Invalid username or password.'
        }, 401);
    }

    await next();
};
app.use('/api/*', appMiddleware);

// Register api routes
app.route('/mqtt', mqtt);
app.route('/api', api);

// Initialize mqtt client
connectMQTT();

// Start Bun server
serve({
    fetch: app.fetch,
    port: process.env.PORT || '3000',
});

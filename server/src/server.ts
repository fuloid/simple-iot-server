// --- server.ts ---
import { OpenAPIHono } from '@hono/zod-openapi';
import type { Context, Next } from 'hono';
import { serve } from 'bun';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import mqtt from '@/controllers/mqtt';
import api from '@/controllers/api';
import { connectMQTT } from './utils/mqtt';
import { swaggerUI } from '@hono/swagger-ui';

export type HonoContext = { 
    Variables: { 
        device_id?: string 
    } 
};
const app = new OpenAPIHono<HonoContext>();

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
app.use('/api/login', appMiddleware);
app.use('/api/online', appMiddleware);
app.use('/api/sensors', appMiddleware);
app.use('/api/action', appMiddleware);

// Register api routes
app.route('/mqtt', mqtt);
app.route('/api', api);

// Serve llms.txt
app.get('/llms.txt', async (c: Context<HonoContext>) => {
    // read the file from "public/llms.txt"
    const file = await Bun.file('public/llms.txt').text();
    return c.text(file.replace('{{url}}', process.env.RAILWAY_PUBLIC_DOMAIN as string), 200, {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'inline; filename="llms.txt"',
    });
});

// Expose openapi spec
app.openAPIRegistry.registerComponent('securitySchemes', 'Basic Auth', {
    type: 'http',
    scheme: 'basic',
    description: 'Basic authentication for all endpoints. Use user/app credentials to login.',
});
app.doc('/docs/openapi.json', {
    openapi: '3.0.0',
    info: {
        title: 'Simple IoT OpenAPI spec',
        description: 'Available endpoints for the user.',
        version: '1.0.0',
        contact: {
            name: 'Fuloid',
            url: 'https://github.com/fuloid/simple-iot-server',
        }
    },
    servers: [
        {
            url: `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`,
            description: 'Current server',
        }
    ]
});
app.get('/docs', swaggerUI({
    url: '/docs/openapi.json',
    title: 'Simple IoT server endpoints'
}));

// Initialize mqtt client
connectMQTT();

// Start Bun server
serve({
    fetch: app.fetch,
    port: process.env.PORT || '3000',
});

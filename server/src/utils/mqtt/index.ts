import mqtt from 'mqtt'
import { readdirSync } from 'fs'
import { join } from 'path'

import type { MqttClient } from 'mqtt';
import type { Logger } from 'pino';

import { generateRandom } from '@/utils'
import { createLogger } from '@/utils/logger'

let connectAttemptReady = false;
let reconnectAttempts = 0;
let handlerRegistered = false;
let client: mqtt.MqttClient | null = null

const logger = createLogger('Realtime');

function calculateReconnectDelay(attempts: number): number {
    if (attempts < 5) return 5000       // first 5 attempts, 5s
    if (attempts < 10) return 15000     // next 5 attempts, 15s
    return 60000                        // then 60s indefinitely
}

export async function connectMQTT() {

    if (!connectAttemptReady) {
        if (!process.env.MQTT_WEB_HOST || process.env.MQTT_WEB_HOST === '') {
            logger.error('MQTT_WEB_HOST is not set. Please set it to your MQTT web host.');
            logger.error('Server will exit...');
            process.exit(1);
        }

        logger.info('Checking MQTT health status...')
        const response = await fetch(`https://${process.env.MQTT_WEB_HOST}/api/v5/status`);

        if (response.ok) {
            logger.info('MQTT server is healthy. Connecting...')
            connectAttemptReady = true;
        } else {
            logger.error('MQTT server is unhealthy. Rechecking in 10 seconds...')
            scheduleReconnect(null, false)
            return
        }
    }

    client = mqtt.connect(`mqtt://${process.env.MQTT_HOST}`!, {
        clientId: generateRandom(12),
        username: 'systemctl',
        password: process.env.MQTT_SECRET_KEY,
        reconnectPeriod: 0, // disable default retry
        connectTimeout: 5000,
    })

    client.on('connect', () => {
        logger.info('Connected to MQTT server')
        reconnectAttempts = 0
    })

    client.on('error', (err) => {
        console.error(err);
        logger.error('Connection error:', err.message)
        client?.end()
        scheduleReconnect()
    })

    client.on('close', () => {
        logger.warn('MQTT server disconnected')
        scheduleReconnect()
    });

    registerHandlers();
}

function scheduleReconnect(delay: number | null = null, log: boolean = true) {
    if (client?.connected) return;
    if (reconnectAttempts > 15) {
        logger.error('Too many reconnection attempts. Stopping until a client connected again...')
        return
    }
    const finalDelay = delay ?? calculateReconnectDelay(reconnectAttempts)
    if (!delay) reconnectAttempts++;
    if (log) logger.info(`[Realtime] Reconnecting in ${finalDelay / 1000}s` + (!delay ? ` (attempt ${reconnectAttempts})` : ''))
    setTimeout(connectMQTT, finalDelay)
}

export function resetAndReattempt() {
    reconnectAttempts = 0
    scheduleReconnect();
}

type HandlerFunctionType = { name: string, default: (client: MqttClient, logger: Logger) => void };
function registerHandlers() {

    if (!client || handlerRegistered) return;

    const handlersDir = join(__dirname, 'handlers');
    const handlerFiles = readdirSync(handlersDir).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of handlerFiles) {
        const path = join(handlersDir, file);
        import(path).then((handlerModule) => {
            const { name, default: register }: HandlerFunctionType = handlerModule;
            const scopedLogger = createLogger(name.toUpperCase(), logger);

            register(client!, scopedLogger);
        }).catch((err) => {
            logger.error(`Failed to load handler ${file}:`, err);
        });
    }

    handlerRegistered = true;
    logger.info('MQTT handlers registered successfully.');
}

export function getClient(): MqttClient {
    if (!client || !client.connected) throw new Error('MQTT client not connected');
    return client;
}
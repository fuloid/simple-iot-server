import { Database } from '@/utils/database';
import type { MqttClient } from 'mqtt';
import type { Logger } from 'pino';

export const name = 'ping';
const pingCache = new Map<string, { lastPing: number, attempt: number }>();

export default function register(client: MqttClient, logger: Logger) {

    // this function will ping devices that has not been pinging again after 15 seconds
    setInterval(() => pingDevices(client, logger), 15 * 1000);

    client.on('message', (topic, message) => {
        // use regex to match topic
        const pingMatch = topic.match(/^device\/([^/]+)\/ping$/);

        if (pingMatch) {
            // try parse json from message
            try {
                const payload = JSON.parse(message.toString())
                if (!payload || payload.c != "PING") return

                // received ping from a device
                const deviceId = pingMatch[1] as string;
                logger.debug(`Received ping from device ${deviceId}`)

                // Update last ping time in the database
                pingCache.set(deviceId, { lastPing: Date.now(), attempt: 0 });
                Database.updateDevicePing(deviceId);

                // send back a pong message
                client.publish(`device/${deviceId}/ping`, JSON.stringify({ c: 'PONG' }), { qos: 1 });

            } catch (err) {
                logger.debug('Invalid JSON payload:', message.toString())
                return
            }
        }
        
    })

    client.on('connect', () => {
        client.subscribe('device/+/ping', (err) => {
            if (err) logger.error('Subscribe error:', err)
            else logger.debug('Subscribed to device/+/ping')
        })
    })
}

function pingDevices(client: MqttClient, logger: Logger) {
    const now = Date.now();
    for (const [deviceId, { lastPing, attempt }] of pingCache.entries()) {
        if (now - lastPing > 15 * 1000) {
            if (attempt < 3) {
                client.publish(`device/${deviceId}/ping`, JSON.stringify({ c: 'PING' }), { qos: 1, retain: true });
                pingCache.set(deviceId, { lastPing, attempt: attempt + 1 });
            } else {
                logger.warn(`Device ${deviceId} not responding after 3 attempts. Removing from cache.`);
                pingCache.delete(deviceId);
            }
        }
    }
}
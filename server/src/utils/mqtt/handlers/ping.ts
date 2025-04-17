import { Database } from '@/utils/database';
import type { MqttClient } from 'mqtt';
import type { Logger } from 'pino';

export const name = 'ping';
let pingCache: { lastPing: number, attempt: number } = { lastPing: 0, attempt: 0 };

export default function register(client: MqttClient, logger: Logger) {
    setInterval(() => pingDevice(client, logger), 10 * 1000);

    client.on('message', (topic, message) => {
        if (topic === "device/ping") {
            try {
                if (message.toString() != "pong") return;
                logger.debug('Received ping feedback from device.');

                // Update last ping time in the database
                pingCache = { lastPing: Date.now(), attempt: 0 };
                Database.updateDevicePing();
            } catch (err) {
                logger.error('Error processing ping event:', err);
                return;
            }
        }
    });

    client.on('connect', () => {
        client.subscribe('device/ping', (err) => {
            if (err) logger.error('Subscribe "device/ping" error:', err);
            else logger.debug('Subscribed to "device/ping"');
        })
    });
}

function pingDevice(client: MqttClient, logger: Logger) {
    const now = Date.now();
    const { lastPing, attempt } = pingCache;
    if (now - lastPing > 15 * 1000) {
        if (attempt == 3) {
            logger.warn("Device is not responding after 3 attempts.");
        }
        if (attempt < 10) {
            client.publish(`device/ping`, 'ping', { qos: 1, retain: true });
            pingCache = { lastPing, attempt: attempt + 1 };
        }
    }
}
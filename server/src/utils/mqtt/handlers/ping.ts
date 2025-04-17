import { Database } from '@/utils/database';
import type { MqttClient } from 'mqtt';
import type { Logger } from 'pino';

export const name = 'ping';
export var ping: () => Promise<boolean>; // Placeholder for ping function
let pingCache: { lastPing: number, attempt: number } = { lastPing: 0, attempt: 0 };

export default function register(client: MqttClient, logger: Logger) {

    // this function will ping devices that has not been pinging again after 15 seconds
    ping = async () => {
        client.publish(`device/ping`, 'ping', { qos: 1, retain: true });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const { lastPing } = pingCache;

        // check if last ping is less than a second ago
        if (Date.now() - lastPing < 2000) return true;
        return false;
    };
    setInterval(() => pingDevice(client, logger), 15 * 1000);

    client.on('message', (topic, message) => {
        console.log(topic, message.toString());
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
        if (attempt < 3) {
            client.publish(`device/ping`, 'ping', { qos: 1, retain: true });
            pingCache = { lastPing, attempt: attempt + 1 };
        } else if (attempt == 3) {
            logger.warn("Device is not responding after 3 attempts.");
            pingCache = { lastPing, attempt: attempt + 1 };
        }
    }
}
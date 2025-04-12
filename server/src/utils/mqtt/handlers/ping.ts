import type { MqttClient } from 'mqtt';
import type { Logger } from 'pino';

export const name = 'ping';

// logger is a normal pino logger instance, with custom prefix, example: [Realtime > PING] ...
export default function register(client: MqttClient, logger: Logger) {
    client.on('message', (topic, message) => {
        // use regex to match topic
        const pingMatch = topic.match(/^device\/([^/]+)\/ping$/);

        if (pingMatch) {
            // try parse json from message
            try {
                const payload = JSON.parse(message.toString())
                if (!payload || payload.c != "PING") return

                // received ping from a device
                const deviceId = pingMatch[1];
                logger.debug(`Received ping from device ${deviceId}`)

                // send back a pong message
                client.publish(`device/${deviceId}/ping`, JSON.stringify({ c: 'PONG' }), { qos: 1, retain: true });

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
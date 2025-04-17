import { Database, type Sensors } from '@/utils/database';
import type { MqttClient } from 'mqtt';
import type { Logger } from 'pino';

export const name = 'sensors';

export default function register(client: MqttClient, logger: Logger) {
    client.on('message', (topic, message) => {
        if (topic.startsWith("device/sensors/")) {
            try {
                const match = topic.match(/device\/sensors\/(\w+)/);
                if (!match) return;

                // get the sensor name from the topic
                const name = match[1] as keyof Sensors;
                const value = parseFloat(message.toString());
                if (isNaN(value)) return; // Ignore invalid values
                logger.debug(`Received sensor data "${name}" from device.`);

                // Update cache data in the database
                Database.updateDeviceSensor(name, value);
            } catch (err) {
                logger.error('Error processing sensor event:', err);
                return;
            }
        }
    });

    client.on('connect', () => {
        client.subscribe('device/sensors/+', (err) => {
            if (err) logger.error('Subscribe "device/sensors/+" error:', err);
            else logger.debug('Subscribed to "device/sensors/+"');
        })
    });
}
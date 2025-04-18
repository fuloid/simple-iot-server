import { createRoute } from '@hono/zod-openapi'
import * as Scheme from '@/types/api/schema'
import * as SensorSchema from '@/types/api/schema/sensors'

export const route = createRoute({
    method: 'get',
    path: '/sensors',
    tags: ['Device'],
    summary: 'Sensor Data',
    description: 'Retrieve current/cached sensor data from the device.',
    security: [
        {
            'Basic Auth': []
        }
    ],
    responses: {
        200: {
            description: 'Sensor data received.',
            content: {
                'application/json': {
                    schema: SensorSchema.Response200
                }
            }
        },
        410: {
            description: 'No sensor data available.',
            content: {
                'application/json': {
                    schema: SensorSchema.Response410
                }
            }
        },
        401: {
            description: 'Unauthorized access.',
            content: {
                'application/json': {
                    schema: Scheme.Response401
                }
            }
        },
        500: {
            description: 'Internal server error.',
            content: {
                'application/json': {
                    schema: Scheme.Response500
                }
            }
        }
    }
});


export default route;
export type Route = typeof route;
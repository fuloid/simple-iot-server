import { createRoute } from '@hono/zod-openapi'
import * as Scheme from '@/types/api/schema'
import * as OnlineSchema from '@/types/api/schema/online'

export const route = createRoute({
    method: 'get',
    path: '/online',
    tags: ['Device'],
    summary: 'Device Online Status',
    description: 'Check if the device is online/offline, with last ping time.',
    security: [
        {
            'Basic Auth': []
        }
    ],
    responses: {
        200: {
            description: 'Device online status received.',
            content: {
                'application/json': {
                    schema: OnlineSchema.Response200
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
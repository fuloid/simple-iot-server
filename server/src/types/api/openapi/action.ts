import { createRoute } from '@hono/zod-openapi'
import * as Scheme from '@/types/api/schema'
import * as ActionSchema from '@/types/api/schema/action'

export const route = createRoute({
    method: 'post',
    path: '/action',
    tags: ['Device'],
    summary: 'Send Action',
    description: 'Send an action to the device. The action can be one of the following: food_refill, water_refill, water_drain.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: ActionSchema.Body
                }
            }
        }
    },
    security: [
        {
            'Basic Auth': []
        }
    ],
    responses: {
        200: {
            description: 'Action sent successfully.',
            content: {
                'application/json': {
                    schema: ActionSchema.Response200
                }
            }
        },
        400: {
            description: 'Invalid action.',
            content: {
                'application/json': {
                    schema: ActionSchema.Response400
                }
            }
        },
        503: {
            description: 'Device offline.',
            content: {
                'application/json': {
                    schema: ActionSchema.Response503
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
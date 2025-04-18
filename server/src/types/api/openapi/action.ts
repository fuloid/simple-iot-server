import { createRoute } from '@hono/zod-openapi'
import * as Scheme from '@/types/api/schema'
import * as ActionSchema from '@/types/api/schema/action'

export const route = createRoute({
    method: 'get',
    path: '/api/sensors',
    request: {
        headers: Scheme.Headers,
        body: {
            content: {
                'application/json': {
                    schema: ActionSchema.Body
                }
            }
        }
    },
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
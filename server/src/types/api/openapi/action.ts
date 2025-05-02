import { createRoute } from '@hono/zod-openapi'
import * as Scheme from '@/types/api/schema'
import * as ActionGetSchema from '@/types/api/schema/actions/get'
import * as ActionPostSchema from '@/types/api/schema/actions/post'

export const getRoute = createRoute({
    method: 'get',
    path: '/action',
    tags: ['Device'],
    summary: 'Get list of actions',
    description: 'Get a list of currently available actions for the device.',
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
                    schema: ActionGetSchema.Response200
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

export const postRoute = createRoute({
    method: 'post',
    path: '/action',
    tags: ['Device'],
    summary: 'Send Action',
    description: 'Send an action to the device. The action can be one of the following: food_refill, water_refill, water_drain.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: ActionPostSchema.Body
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
                    schema: ActionPostSchema.Response200
                }
            }
        },
        400: {
            description: 'Invalid action.',
            content: {
                'application/json': {
                    schema: ActionPostSchema.Response400
                }
            }
        },
        503: {
            description: 'Device offline.',
            content: {
                'application/json': {
                    schema: ActionPostSchema.Response503
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


export type PostRoute = typeof postRoute;
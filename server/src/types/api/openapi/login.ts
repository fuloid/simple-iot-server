import { createRoute } from '@hono/zod-openapi'
import * as Scheme from '@/types/api/schema'

export const route = createRoute({
    method: 'get',
    path: '/api/login',
    request: {
        headers: Scheme.Headers
    },
    responses: {
        200: {
            description: 'Login successful.',
            content: {
                'application/json': {
                    schema: Scheme.Response200.openapi('LoginResponse', {
                        description: 'Login successful.',
                        example: {
                            success: true,
                            code: 'OK',
                            message: 'Login successful.',
                        }
                    })
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
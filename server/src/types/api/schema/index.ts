import { z } from "@hono/zod-openapi";

export const Headers = z.object({
    authorization: z.string().refine((value) => {
        return value.startsWith('Basic ') && value.length > 6;
    }).openapi('AuthorizationHeader', {
        description: 'Basic authentication header.',
        example: 'Basic dXNlcjpwYXNzd29yZA=='
    })
});

export const Response200 = z.object({
    success: z.literal(true),
    code: z.literal('OK'),
    message: z.string()
});
export type Response200 = z.infer<typeof Response200>;

export const Response401 = z.object({
    success: z.literal(false),
    code: z.literal('UNAUTHORIZED'),
    message: z.string()
}).openapi('UnauthorizedResponse', {
    description: 'Unauthorized access.',
    examples: [
        {
            success: false,
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization.'
        },
        {
            success: false,
            code: 'UNAUTHORIZED',
            message: 'Invalid username or password.'
        }
    ]
});
export type Response401 = z.infer<typeof Response401>;

export const Response500 = z.object({
    success: z.literal(false),
    code: z.literal('ERROR'),
    message: z.string()
}).openapi('ErrorResponse', {
    description: 'Internal server error.',
    example: {
        success: false,
        code: 'ERROR',
        message: 'Internal server error.'
    }
});
export type Response500 = z.infer<typeof Response500>;
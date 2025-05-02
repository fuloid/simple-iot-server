import { z } from '@hono/zod-openapi';
import * as Scheme from '@/types/api/schema';
import { actions } from '.';

export const Body = z.object({
    action: z.enum(Object.keys(actions) as [keyof typeof actions]),
}).openapi('ActionParams', {
    description: 'Action to be performed by the device',
    example: {
        action: 'water_refill'
    },
    required: ['action'],
});
export type Body = z.infer<typeof Body>;

export const Response200 = Scheme.Response200
    .openapi('ActionResponse', {
        description: 'Action sent successfully',
        example: {
            success: true,
            code: 'OK',
            message: 'Action successfully sent to device.',
        }
    });

export const Response503 = z.object({
    success: z.literal(false),
    code: z.literal('ACTION_UNAVAILABLE'),
    message: z.string()
}).openapi('DeviceUnavailableResponse', {
    description: 'Action execution failed due to device offline or another action is still running.',
    examples: [
        {
            success: false,
            code: 'ACTION_UNAVAILABLE',
            message: 'Device is offline.'
        },
        {
            success: false,
            code: 'ACTION_UNAVAILABLE',
            message: 'Another action is still running.'
        }
    ]
});
export type Response503 = z.infer<typeof Response503>;

export const Response400 = z.object({
    success: z.literal(false),
    code: z.literal('INVALID_ACTION'),
    message: z.string()
}).openapi('InvalidActionResponse', {
    description: 'Action execution failed due to given invalid action.',
    example: {
        success: false,
        code: 'INVALID_ACTION',
        message: 'Invalid action.'
    }
});
export type Response400 = z.infer<typeof Response400>;

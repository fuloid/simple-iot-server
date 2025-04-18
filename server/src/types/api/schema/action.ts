import { z } from '@hono/zod-openapi';
import * as Scheme from '@/types/api/schema';

export const Body = z.object({
    action: z.enum(['food_refill', 'water_refill', 'water_drain'])
}).openapi('ActionParams', {
    description: 'Action to be performed by the device',
    example: {
        action: 'food_refill'
    }
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
    code: z.literal('DEVICE_OFFLINE'),
    message: z.string()
}).openapi('DeviceOfflineResponse', {
    description: 'Action execution failed due to device offline.',
    example: {
        success: false,
        code: 'DEVICE_OFFLINE',
        message: 'Device is offline.'
    }
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

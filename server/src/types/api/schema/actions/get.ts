import { z } from '@hono/zod-openapi';
import actions, { ActionDataSchema } from '.';

export const Response200 = z.object({
    success: z.literal(true),
    code: z.literal('OK'),
    message: z.string(),
    data: ActionDataSchema
}).openapi('ActionResponse', {
    description: 'Action list fetched successfully.',
    example: {
        success: true,
        code: 'OK',
        message: 'Action list fetched successfully.',
        data: actions
    }
});
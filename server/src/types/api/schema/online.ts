import { z } from "@hono/zod-openapi";
import * as Scheme from "@/types/api/schema";

export const Response200 = Scheme.Response200.merge(
    z.object({
        data: z.object({
            online: z.boolean(),
            last_ping: z.string(),
        })
    })
).openapi('OnlineResponse', {
    description: 'Device online status received.',
    examples: [
        {
            success: true,
            code: 'OK',
            message: 'Device is online.',
            data: {
                online: true,
                last_ping: '2023-10-01T12:00:00Z'
            }
        },
        {
            success: true,
            code: 'OK',
            message: 'Device is offline.',
            data: {
                online: false,
                last_ping: '2023-10-01T12:00:00Z'
            }
        }
    ]
});
export type Response200 = z.infer<typeof Response200>;
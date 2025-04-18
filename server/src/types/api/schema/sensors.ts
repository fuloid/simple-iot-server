import { z } from "@hono/zod-openapi";
import * as Scheme from "@/types/api/schema";

export const Response200 = Scheme.Response200.merge(
    z.object({
        data: z.object({
            water_temp: z.number(),
            water_acidity: z.number(),
            water_turbidity: z.number(),
            water_level: z.number(),
            air_temp: z.number(),
            humidity: z.number(),
            food_level: z.number()
        }),
    })
).openapi('SensorsResponse', {
    description: 'Sensors data received.',
    example: {
        success: true,
        code: 'OK',
        message: 'Sensors data received.',
        data: {
            water_temp: 25.5,
            water_acidity: 7.0,
            water_turbidity: 1.2,
            water_level: 50.0,
            air_temp: 22.0,
            humidity: 45.0,
            food_level: 75.0
        }
    }
});
export type Response200 = z.infer<typeof Response200>;

export const Response410 = z.object({
    success: z.literal(false),
    code: z.literal('NO_DATA'),
    message: z.string()
}).openapi('NoDataResponse', {
    description: 'No sensor data available.',
    example: {
        success: false,
        code: 'NO_DATA',
        message: 'No sensor data available.'
    }
});
export type Response410 = z.infer<typeof Response410>;
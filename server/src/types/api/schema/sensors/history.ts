import { z } from "@hono/zod-openapi";
import * as Scheme from "@/types/api/schema";
import { SensorDataSchema } from ".";

export const Body = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
})
    .refine((data) => {
        if (data.from) {
            const fromDate = new Date(data.from);
            if (isNaN(fromDate.getTime())) return false;

            if (data.to) {
                const toDate = new Date(data.to);
                if (isNaN(toDate.getTime())) return false;
                return fromDate <= toDate;
            }
        } else if (data.to) {
            const toDate = new Date(data.to);
            if (isNaN(toDate.getTime())) return false;
        }
        return true;
    }, "Invalid date format or 'from' date is after 'to' date")
    .openapi('SensorHistoryParams', {
        description: 'Page number for paginated sensor data.',
        example: {
            from: '2025-05-01T00:00:00Z',
            to: '2025-05-03T00:00:00Z',
            page: 1,
            limit: 10,
        },
    });
export type Body = z.infer<typeof Body>;

export const Response200 = Scheme.Response200.merge(
    z.object({
        data: z.object({
            page: z.number().optional(),
            page_size: z.number().optional(),
            history: z.array(
                z.object({
                    timestamp: z.string(),
                    data: SensorDataSchema,
                })
            ),
        })
    })
).openapi('SensorsHistoryResponse', {
    description: 'Sensors data received.',
    example: {
        success: true,
        code: 'OK',
        message: 'Sensors data received.',
        data: {
            page: 1,
            page_size: 10,
            history: [
                {
                    timestamp: '2025-05-03T12:00:00Z',
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
            ]
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
import { z } from "@hono/zod-openapi";

export const SensorDataSchema = z.object({
    water_temp: z.number(),
    water_acidity: z.number(),
    water_turbidity: z.number(),
    water_level: z.number(),
    air_temp: z.number(),
    humidity: z.number(),
    food_level: z.number()
});
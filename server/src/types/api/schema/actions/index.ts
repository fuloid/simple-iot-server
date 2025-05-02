import { z } from '@hono/zod-openapi';

export const ActionDataSchema = z.record(z.object({
    title: z.string(),
    icon: z.string(),
    enabled: z.boolean().default(true)
}));

// Actual actions data
export const actions: ActionDataSchema = {
    food_refill: { title: 'Food Refill', icon: 'food', enabled: true },
    water_refill: { title: 'Water Refill', icon: 'water', enabled: true },
    water_drain: { title: 'Water Drain', icon: 'drain', enabled: true }
}

export default actions;
export type ActionDataSchema = z.infer<typeof ActionDataSchema>;
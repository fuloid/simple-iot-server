import {
    pgTable,
    uuid,
    jsonb,
    timestamp,
    text,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

export const histories = pgTable('histories', {
    id: uuid('id').primaryKey(),
    cache_data: jsonb('cache_data'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type History = InferSelectModel<typeof histories>;
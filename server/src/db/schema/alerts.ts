import {
    pgTable,
    uuid,
    text,
    boolean,
    jsonb,
    timestamp,
    pgEnum,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

export const alertTypeEnum = pgEnum('alert_type', [
    'info',
    'warn',
    'danger',
]);

export const alerts = pgTable('alerts', {
    id: uuid('id').primaryKey(),
    type: alertTypeEnum('type').notNull(),
    title: text('title').notNull(),
    metadata: jsonb('metadata'),
    ack: boolean('ack').default(false).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Alert = InferSelectModel<typeof alerts>;
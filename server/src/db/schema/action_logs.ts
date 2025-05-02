import {
    pgTable,
    uuid,
    jsonb,
    timestamp,
    pgEnum,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

export const actionTypeEnum = pgEnum('action_type', [
    'device_auth',
    'device_update_action',
    'user_auth',
    'user_send_action',
]);

export const action_logs = pgTable('action_logs', {
    id: uuid('id').primaryKey(),
    type: actionTypeEnum('type').notNull(),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ActionLog = InferSelectModel<typeof action_logs>;
import {
    pgTable,
    uuid,
    text,
    jsonb,
    timestamp,
    pgEnum,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

export const actionTypeEnum = pgEnum('action_type', [
    'device_auth',
    'user_auth',
    'user_action',
]);

export const action_logs = pgTable('action_logs', {
    id: uuid('id').primaryKey(),
    type: actionTypeEnum('type').notNull(),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const devices = pgTable('devices', {
    id: uuid('id').primaryKey(),
    last_ping: timestamp('last_ping', { withTimezone: true }),
    cache_data: jsonb('cache_data'),
    cache_config: jsonb('cache_config'),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ActionLog = InferSelectModel<typeof action_logs>;
export type Device = InferSelectModel<typeof devices>;

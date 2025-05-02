import {
    pgTable,
    uuid,
    jsonb,
    timestamp,
    pgEnum,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

export const configEnum = pgEnum('config_enum_id', ['1']);

export const devices = pgTable('devices', {
    id: configEnum('id'),
    last_ping: timestamp('last_ping', { withTimezone: true }),
    last_action: timestamp('last_action', { withTimezone: true }),
    cache_data: jsonb('cache_data'),
    cache_config: jsonb('cache_config'),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Device = InferSelectModel<typeof devices>;
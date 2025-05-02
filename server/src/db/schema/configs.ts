import {
    pgTable,
    jsonb,
    timestamp,
    pgEnum,
    boolean,
    time,
    integer
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

export const configEnum = pgEnum('config_enum_id', ['1'])

export const configs = pgTable('configs', {
    id: configEnum('id'),

    auto_pakan_enabled: boolean('auto_pakan_enabled').default(false).notNull(),
    auto_pakan_time: time('auto_pakan_time').array().default([
        '07:00',
        '17:00'
    ]).notNull(),

    histories_enabled: boolean('histories_enabled').default(false).notNull(),
    histories_auto_purge_day: integer('histories_auto_purge').default(7).notNull(),

    alert_enabled: boolean('alert_enabled').default(false).notNull(),
    alert_threshold: jsonb('alert_threshold').default({
        "acidity": { "min": 6, "max": 9 },
        "turbidity": { "min": 0, "max": 25 },
        "temp": { "min": 25, "max": 30 }
    }).notNull(),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Config = InferSelectModel<typeof configs>;
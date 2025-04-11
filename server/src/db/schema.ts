import type { InferSelectModel } from 'drizzle-orm';
import {
    pgTable,
    uuid,
    text,
    timestamp,
    primaryKey,
} from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    username: text('username').notNull().unique(),
    encrypted_password: text('encrypted_password').notNull(),
    last_login_at: timestamp('last_login_at', { withTimezone: true }),
    last_ping_at: timestamp('last_ping_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Master devices table (controller)
export const master_devices = pgTable('master_devices', {
    id: uuid('id').primaryKey(),
    name: text('name'),
    owner_id: uuid('owner_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    token: text('token'),
    token_expires_at: timestamp('token_expires_at', { withTimezone: true }),
    last_ping_at: timestamp('last_ping_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Agent devices table (agent)
export const agent_devices = pgTable('agent_devices', {
    id: uuid('id').primaryKey(),
    name: text('name'),
    token: text('token'),
    token_expires_at: timestamp('token_expires_at', { withTimezone: true }),
    last_ping_at: timestamp('last_ping_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Users - Master devices join table
export const users_devices = pgTable('users_devices', {
    user_id: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    device_id: uuid('master_device_id')
        .notNull()
        .references(() => master_devices.id, { onDelete: 'cascade' }),
});

// Master - Agent devices join table
export const master_agent_devices = pgTable('master_agent_devices', {
    master_device_id: uuid('master_device_id')
        .notNull()
        .references(() => master_devices.id, { onDelete: 'cascade' }),
    agent_device_id: uuid('agent_device_id')
        .notNull()
        .references(() => agent_devices.id, { onDelete: 'cascade' }),
});

export type User = InferSelectModel<typeof users>;
export type MasterDevice = InferSelectModel<typeof master_devices>;
export type AgentDevice = InferSelectModel<typeof agent_devices>;
export type UserDevice = InferSelectModel<typeof users_devices>;
export type MasterAgentDevice = InferSelectModel<typeof master_agent_devices>;

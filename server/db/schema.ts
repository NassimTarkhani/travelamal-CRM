import { pgTable, uuid, text, numeric, boolean, date, timestamp, serial } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    role: text('role').notNull().default('Employé'),
    avatar_url: text('avatar_url'),
    password_hash: text('password_hash').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const clients = pgTable('clients', {
    id: uuid('id').primaryKey().defaultRandom(),
    sequential_number: serial('sequential_number').notNull(),
    full_name: text('full_name').notNull(),
    profession: text('profession'),
    marital_status: text('marital_status'),
    id_card_number: text('id_card_number'),
    phone_primary: text('phone_primary').notNull(),
    phone_secondary: text('phone_secondary'),
    email: text('email'),
    birth_date: date('birth_date'),
    nationality: text('nationality'),
    address_street: text('address_street'),
    address_city: text('address_city'),
    address_governorate: text('address_governorate'),
    folder_opening_date: date('folder_opening_date'),
    passport_number: text('passport_number'),
    passport_expiry: date('passport_expiry'),
    passport_alert_done: boolean('passport_alert_done').default(false),
    b3_expiry: date('b3_expiry'),
    b3_alert_done: boolean('b3_alert_done').default(false),
    embassy_registration_date: date('embassy_registration_date'),
    travel_alert_done: boolean('travel_alert_done').default(false),
    service: text('service'),
    color_tag: text('color_tag').notNull().default('blue'),
    status: text('status').default('Nouveau'),
    total_amount: numeric('total_amount', { precision: 10, scale: 3 }).default('0'),
    amount_paid: numeric('amount_paid', { precision: 10, scale: 3 }).default('0'),
    refund_amount: numeric('refund_amount', { precision: 10, scale: 3 }).default('0'),
    payment_method: text('payment_method'),
    appointment_date: timestamp('appointment_date', { withTimezone: true }),
    travel_date: date('travel_date'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    created_by: uuid('created_by').references(() => profiles.id),
    responsible_employee: uuid('responsible_employee').references(() => profiles.id),
});

export const payments = pgTable('payments', {
    id: uuid('id').primaryKey().defaultRandom(),
    client_id: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 3 }).notNull(),
    payment_date: date('payment_date').defaultNow(),
    method: text('method'),
    recorded_by: uuid('recorded_by').references(() => profiles.id),
    is_deleted: boolean('is_deleted').default(false),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const documents = pgTable('documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    client_id: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
    document_type: text('document_type'),
    file_url: text('file_url').notNull(),
    file_name: text('file_name'),
    upload_date: timestamp('upload_date', { withTimezone: true }).defaultNow(),
    expiry_date: date('expiry_date'),
    status: text('status').default('Présent'),
    uploaded_by: uuid('uploaded_by').references(() => profiles.id),
});

export const expenses = pgTable('expenses', {
    id: uuid('id').primaryKey().defaultRandom(),
    amount: numeric('amount', { precision: 10, scale: 3 }).notNull(),
    description: text('description').notNull(),
    proof_url: text('proof_url'),
    client_id: uuid('client_id').references(() => clients.id),
    created_by: uuid('created_by').references(() => profiles.id),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const activities = pgTable('activities', {
    id: uuid('id').primaryKey().defaultRandom(),
    client_id: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
    action_type: text('action_type'),
    description: text('description').notNull(),
    performed_by: uuid('performed_by').references(() => profiles.id),
    action_date: timestamp('action_date', { withTimezone: true }).defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

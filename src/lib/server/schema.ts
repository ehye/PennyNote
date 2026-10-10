import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  currency: text('currency').notNull(),
  version: integer('version').notNull().default(1),
  balanceTarget: integer('balance_target'),
  balanceDate: text('balance_date')
}, (t) => [uniqueIndex('account_name_currency').on(t.name, t.currency)]);

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  parentId: text('parent_id'),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('')
});

export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['Expense', 'Income', 'Transfer', 'Adjustment'] }).notNull(),
  date: text('date').notNull(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  destinationId: text('destination_id').references(() => accounts.id),
  categoryId: text('category_id').references(() => categories.id),
  amount: integer('amount').notNull(),
  notes: text('notes').notNull().default(''),
  balanceBefore: integer('balance_before'),
  balanceAfter: integer('balance_after'),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull().default('')
});

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Entry = typeof entries.$inferSelect;

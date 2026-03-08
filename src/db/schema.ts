import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  userId: text('user_id').notNull(),
  projectId: text('project_id'),
  embedding: text('embedding'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

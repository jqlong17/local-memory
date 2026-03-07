import { pgTable, text, timestamp, vector } from 'drizzle-orm/pg-core';

export const memories = pgTable('memories', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  userId: text('user_id').notNull(),
  projectId: text('project_id'),
  embedding: vector('embedding', { dimensions: 768 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_URL || './memory.db');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    user_id TEXT NOT NULL,
    project_id TEXT,
    embedding TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );
`);

export const db = drizzle(sqlite, { schema });

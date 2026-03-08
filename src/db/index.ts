import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';

const dbPath = process.env.DATABASE_URL || './memory.db';
const sqlite = new Database(dbPath);

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

console.log('✅ SQLite database initialized');

export const db = drizzle(sqlite, { schema });
export { sqlite };

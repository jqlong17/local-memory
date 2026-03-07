import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateEmbedding, searchSimilar } from './services/embedding';
import { db } from './db';
import { memories } from './db/schema';
import { nanoid } from 'nanoid';

const app = new Hono();

app.use('/*', cors());

app.get('/', (c) => c.json({ status: 'ok', message: 'Local Memory API' }));

app.post('/memory', async (c) => {
  const { content, userId, projectId } = await c.req.json();
  
  if (!content || !userId) {
    return c.json({ error: 'content and userId are required' }, 400);
  }

  const embedding = await generateEmbedding(content);
  
  const id = nanoid();
  await db.insert(memories).values({
    id,
    content,
    userId,
    projectId,
    embedding,
  });

  return c.json({ id, success: true });
});

app.post('/recall', async (c) => {
  const { query, userId, projectId, limit } = await c.req.json();
  
  if (!query || !userId) {
    return c.json({ error: 'query and userId are required' }, 400);
  }

  const results = await searchSimilar(query, userId, limit || 5);
  
  return c.json({ memories: results });
});

app.get('/memory/:userId', async (c) => {
  const userId = c.req.param('userId');
  
  try {
    const { eq } = await import('drizzle-orm');
    const results = await db
      .select()
      .from(memories)
      .where(eq(memories.userId, userId));
    
    return c.json({ memories: results });
  } catch (error) {
    console.error('Error fetching memories:', error);
    return c.json({ error: 'Failed to fetch memories' }, 500);
  }
});

const PORT = process.env.PORT || 3001;
console.log(`Server running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};

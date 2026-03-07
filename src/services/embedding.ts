import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://localhost:11434' });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ollama.embeddings({
    model: 'nomic-embed-text',
    prompt: text,
  });
  return response.embedding;
}

export async function searchSimilar(
  query: string,
  userId: string,
  limit: number = 5
) {
  const queryEmbedding = await generateEmbedding(query);
  
  const { db } = await import('../db');
  const { memories } = await import('../db/schema');
  const { sql } = await import('drizzle-orm');
  
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  
  const results = await db.execute(sql`
    SELECT * FROM memories 
    WHERE user_id = ${userId}
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);
  
  return results;
}

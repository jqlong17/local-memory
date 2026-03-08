import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://localhost:11434' });

export async function generateEmbedding(text: string): Promise<string> {
  const response = await ollama.embeddings({
    model: 'nomic-embed-text',
    prompt: text,
  });
  return JSON.stringify(response.embedding);
}

function cosineSimilarity(vec1: number[], vec2: number[]): number {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (mag1 * mag2);
}

export async function searchSimilar(
  query: string,
  userId: string,
  limit: number = 5
) {
  const queryEmbedding = await generateEmbedding(query);
  const queryVec = JSON.parse(queryEmbedding);
  
  const { db } = await import('../db');
  const { memories } = await import('../db/schema');
  const { eq, desc } = await import('drizzle-orm');
  
  const allMemories = await db
    .select()
    .from(memories)
    .where(eq(memories.userId, userId));
  
  const withSimilarity = allMemories
    .map(m => {
      if (!m.embedding) return { ...m, similarity: -1 };
      try {
        const storedVec = JSON.parse(m.embedding);
        const similarity = cosineSimilarity(queryVec, storedVec);
        return { ...m, similarity };
      } catch {
        return { ...m, similarity: -1 };
      }
    })
    .filter(m => m.similarity > -1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
  
  return {
    rows: withSimilarity,
    rowCount: withSimilarity.length
  };
}

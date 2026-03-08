import { Ollama } from 'ollama';
import { getMemoryConfig } from '../config/memory';

const ollama = new Ollama({ host: 'http://localhost:11434' });

/**
 * 计算时间衰减因子
 * 使用指数衰减公式: e^(-λ * t)，其中 λ = ln(2) / halfLifeDays
 */
function calculateTimeDecayFactor(createdAt: Date, halfLifeDays: number): number {
  const now = Date.now();
  const ageMs = now - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const lambda = Math.log(2) / halfLifeDays;
  return Math.exp(-lambda * ageDays);
}

/**
 * 标准化时间分数（0-1，越近越高）
 */
function normalizeTimeScore(createdAt: Date): number {
  const now = Date.now();
  const maxAgeMs = 365 * 24 * 60 * 60 * 1000; // 1年作为最大时间窗口
  const ageMs = now - createdAt.getTime();
  return Math.max(0, 1 - ageMs / maxAgeMs);
}

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
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}

export async function searchSimilar(
  query: string,
  userId: string,
  limit: number = 5
) {
  const config = getMemoryConfig();
  const queryEmbeddingStr = await generateEmbedding(query);
  const queryVec = JSON.parse(queryEmbeddingStr);
  
  const { db } = await import('../db');
  const { memories } = await import('../db/schema');
  const { eq } = await import('drizzle-orm');
  
  const allMemories = await db
    .select()
    .from(memories)
    .where(eq(memories.userId, userId));
  
  const scoredMemories = allMemories
    .map(m => {
      if (!m.embedding) return null;
      try {
        const storedVec = JSON.parse(m.embedding);
        const semanticScore = cosineSimilarity(queryVec, storedVec);
        
        let finalScore: number;
        const createdAt = m.createdAt || new Date();
        
        switch (config.searchMode) {
          case 'exponential':
            // 仅指数衰减: 语义相似度 × 时间衰减因子
            finalScore = semanticScore * calculateTimeDecayFactor(createdAt, config.decayHalfLifeDays);
            break;
            
          case 'hybrid':
            // 混合评分: 加权组合语义相似度和时间分数
            const timeScore = normalizeTimeScore(createdAt);
            finalScore = (1 - config.hybridTimeWeight) * semanticScore + config.hybridTimeWeight * timeScore;
            break;
            
          case 'no-decay':
          default:
            // 不衰减: 仅语义相似度
            finalScore = semanticScore;
            break;
        }
        
        return { 
          ...m, 
          semanticScore,
          finalScore,
          timeDecayFactor: config.searchMode === 'exponential' 
            ? calculateTimeDecayFactor(createdAt, config.decayHalfLifeDays)
            : undefined
        };
      } catch {
        return null;
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);
  
  return {
    rows: scoredMemories,
    rowCount: scoredMemories.length,
    config: {
      mode: config.searchMode,
      halfLifeDays: config.decayHalfLifeDays,
      timeWeight: config.hybridTimeWeight
    }
  };
}

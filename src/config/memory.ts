/**
 * 记忆检索配置
 */
export interface MemoryConfig {
  /** 检索模式 */
  searchMode: 'no-decay' | 'exponential' | 'hybrid';
  /** 时间衰减因子（天数，默认 30 天半衰期） */
  decayHalfLifeDays: number;
  /** 混合评分中时间权重（0-1，默认 0.3） */
  hybridTimeWeight: number;
}

/**
 * 从环境变量读取配置
 */
export function getMemoryConfig(): MemoryConfig {
  const mode = process.env.MEMORY_SEARCH_MODE || 'hybrid';
  
  return {
    searchMode: (mode as MemoryConfig['searchMode']) || 'hybrid',
    decayHalfLifeDays: parseInt(process.env.MEMORY_DECAY_HALF_LIFE_DAYS || '30', 10),
    hybridTimeWeight: parseFloat(process.env.MEMORY_HYBRID_TIME_WEIGHT || '0.3'),
  };
}

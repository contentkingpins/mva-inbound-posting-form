import NodeCache from 'node-cache';

// Determine whether to use DynamoDB or in-memory cache
const useDynamoCache = process.env.USE_DYNAMO_CACHE === '1';

/**
 * Cache interface for the application
 */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

/**
 * In-memory cache implementation using node-cache
 */
class MemoryCache implements Cache {
  private nodeCache: NodeCache;
  
  constructor() {
    // Default TTL is 60 seconds, can be overridden with environment variable
    const ttl = parseInt(process.env.CACHE_TTL || '60', 10);
    this.nodeCache = new NodeCache({ stdTTL: ttl });
  }
  
  async get<T>(key: string): Promise<T | null> {
    const value = this.nodeCache.get<T>(key);
    return value || null;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.nodeCache.set(key, value, ttl);
  }
  
  async del(key: string): Promise<void> {
    this.nodeCache.del(key);
  }
}

/**
 * DynamoDB cache stub - would be implemented fully in production
 */
class DynamoCache implements Cache {
  async get<T>(key: string): Promise<T | null> {
    console.log(`DynamoDB get: ${key}`);
    // In a real implementation, this would query DynamoDB
    return null;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    console.log(`DynamoDB set: ${key}`);
    // In a real implementation, this would write to DynamoDB with TTL
  }
  
  async del(key: string): Promise<void> {
    console.log(`DynamoDB delete: ${key}`);
    // In a real implementation, this would delete from DynamoDB
  }
}

// Export the appropriate cache implementation based on environment
export const cache: Cache = useDynamoCache ? new DynamoCache() : new MemoryCache(); 
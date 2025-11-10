import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';

const CACHE_DIR = join(tmpdir(), '.openskills-cache');
const CACHE_TTL = 60000; // 1 minute

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  sourceHash: string;
}

/**
 * Fast filesystem-based cache with TTL and invalidation
 * 
 * Why filesystem cache?
 * - Persists across CLI invocations (unlike in-memory)
 * - Node fs is extremely fast for small files
 * - Auto-cleanup via OS tmpdir
 * - Simple implementation, no external deps
 * 
 * Performance:
 * - Cache hit: <5ms (read small JSON file)
 * - Cache miss: Full operation time + ~10ms to write cache
 * - Invalidation: Automatic via TTL + source hash validation
 */
export class FastCache<T> {
  private namespace: string;
  
  constructor(namespace: string) {
    this.namespace = namespace;
  }
  
  /**
   * Get cache file path for a key
   */
  private getPath(key: string): string {
    const hash = createHash('sha256')
      .update(`${this.namespace}:${key}`)
      .digest('hex')
      .slice(0, 16);
    return join(CACHE_DIR, `${hash}.json`);
  }
  
  /**
   * Get cached value if valid
   * @param key - Cache key
   * @param validator - Optional function to check if source changed
   * @returns Cached value or null if invalid/missing
   */
  get(key: string, validator?: () => string): T | null {
    const path = this.getPath(key);
    if (!existsSync(path)) return null;
    
    try {
      const entry: CacheEntry<T> = JSON.parse(readFileSync(path, 'utf-8'));
      
      // Check TTL
      if (Date.now() - entry.timestamp > CACHE_TTL) {
        return null;
      }
      
      // Validate source hasn't changed (optional)
      if (validator && validator() !== entry.sourceHash) {
        return null;
      }
      
      return entry.data;
    } catch {
      // Invalid cache file - treat as miss
      return null;
    }
  }
  
  /**
   * Store value in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param sourceHash - Optional hash for invalidation
   */
  set(key: string, data: T, sourceHash = ''): void {
    try {
      // Ensure cache directory exists
      if (!existsSync(CACHE_DIR)) {
        mkdirSync(CACHE_DIR, { recursive: true });
      }
      
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        sourceHash
      };
      
      writeFileSync(this.getPath(key), JSON.stringify(entry));
    } catch {
      // Silent fail - never break due to caching
    }
  }
  
  /**
   * Clear cached value for a key (useful for tests)
   */
  clear(key: string): void {
    try {
      const path = this.getPath(key);
      if (existsSync(path)) {
        rmSync(path);
      }
    } catch {
      // Silent fail
    }
  }
}

/**
 * Clear all caches (useful for tests)
 */
export function clearAllCaches(): void {
  try {
    if (existsSync(CACHE_DIR)) {
      rmSync(CACHE_DIR, { recursive: true, force: true });
    }
  } catch {
    // Silent fail
  }
}

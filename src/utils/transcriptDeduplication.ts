/**
 * Efficient transcript deduplication using hash-based approach
 * Replaces O(n²) similarity checking with O(1) hash lookups
 */
class TranscriptDeduplicator {
  private recentHashes = new Map<string, number>(); // hash -> timestamp
  private readonly HASH_EXPIRY = 5000; // 5 seconds
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Check if a transcript is a duplicate based on hash
   * O(1) time complexity
   */
  isDuplicate(text: string): boolean {
    const hash = this.simpleHash(text);
    const now = Date.now();
    
    // Clean expired entries if cache is getting large
    if (this.recentHashes.size > this.MAX_CACHE_SIZE) {
      this.cleanup(now);
    }
    
    // Check if duplicate
    const existingTime = this.recentHashes.get(hash);
    if (existingTime && (now - existingTime) < this.HASH_EXPIRY) {
      return true;
    }
    
    // Add to cache
    this.recentHashes.set(hash, now);
    return false;
  }

  /**
   * Create a simple hash based on text characteristics
   * Fast and good enough for deduplication
   */
  private simpleHash(text: string): string {
    const normalized = text.toLowerCase().trim();
    const length = normalized.length;
    
    // Hash based on length + first/last chars + middle sample
    const first = normalized.slice(0, 20);
    const last = normalized.slice(-20);
    const middle = normalized.slice(Math.floor(length / 2) - 10, Math.floor(length / 2) + 10);
    
    return `${length}_${first}_${middle}_${last}`;
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(now: number): void {
    // Use forEach for ES5 compatibility
    this.recentHashes.forEach((time, hash) => {
      if (now - time > this.HASH_EXPIRY) {
        this.recentHashes.delete(hash);
      }
    });
  }

  /**
   * Clear all cached hashes
   */
  clear(): void {
    this.recentHashes.clear();
  }

  /**
   * Get current cache size for monitoring
   */
  getCacheSize(): number {
    return this.recentHashes.size;
  }
}

// Export singleton instance
export const transcriptDeduplicator = new TranscriptDeduplicator();
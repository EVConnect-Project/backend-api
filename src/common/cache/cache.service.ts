import { Inject, Injectable, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";

/**
 * Thin wrapper over the @nestjs/cache-manager Cache so call-sites don't
 * depend on the underlying client and so cache failures degrade to "miss"
 * instead of bubbling exceptions up the request stack.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await this.cache.get<T>(key);
      return value ?? null;
    } catch (err) {
      this.logger.warn(`cache get(${key}) failed: ${String(err)}`);
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      await this.cache.set(key, value, ttlMs);
    } catch (err) {
      this.logger.warn(`cache set(${key}) failed: ${String(err)}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cache.del(key);
    } catch (err) {
      this.logger.warn(`cache del(${key}) failed: ${String(err)}`);
    }
  }

  /**
   * Cache-aside helper. Returns the cached value when present; on miss,
   * runs the producer, caches its result, and returns it.
   *
   * Producer errors are NOT cached — the next call retries.
   */
  async wrap<T>(
    key: string,
    ttlMs: number,
    producer: () => Promise<T>,
  ): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null && hit !== undefined) {
      return hit;
    }
    const fresh = await producer();
    // Set in the background — don't make the request pay for cache write
    // latency. Errors are already swallowed in `set`.
    void this.set(key, fresh, ttlMs);
    return fresh;
  }

  /**
   * Bulk delete by prefix. Used when invalidating "all of X" — e.g. every
   * charger:list:* entry after a charger create/update.
   *
   * Note: cache-manager v7 does not expose a native prefix-scan, so we
   * track an explicit index of keys per prefix. Callers should use the
   * same `prefix` when storing keys via `setWithIndex`.
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    const indexKey = `__idx:${prefix}`;
    const keys = (await this.get<string[]>(indexKey)) ?? [];
    await Promise.allSettled(keys.map((k) => this.del(k)));
    await this.del(indexKey);
  }

  /**
   * Like `set` but also records the key under a prefix index so
   * `invalidatePrefix(prefix)` can sweep it later.
   */
  async setWithIndex<T = unknown>(
    prefix: string,
    key: string,
    value: T,
    ttlMs?: number,
  ): Promise<void> {
    await this.set(key, value, ttlMs);
    const indexKey = `__idx:${prefix}`;
    const current = (await this.get<string[]>(indexKey)) ?? [];
    if (!current.includes(key)) {
      current.push(key);
      // Index TTL slightly longer than data TTL so a slow invalidation
      // request still finds the keys to delete.
      await this.set(indexKey, current, (ttlMs ?? 60_000) * 2);
    }
  }
}

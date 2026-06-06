import { Global, Module, Logger } from "@nestjs/common";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Cacheable } from "cacheable";
import KeyvRedis from "@keyv/redis";
import Keyv from "keyv";
import { CacheService } from "./cache.service";

const log = new Logger("CacheModule");

/**
 * Global cache module. Uses Redis when REDIS_URL is set, otherwise falls
 * back to an in-process memory store so dev / CI / tests still work.
 *
 * - Redis URL format: redis://[user:pass@]host:port[/db]
 * - Memory fallback: bounded LRU (Keyv default), good for single-process dev.
 *
 * The cache backing is wrapped in `Cacheable` (the cache-manager v7 store
 * interface) and consumed via the Nest CACHE_MANAGER token through our
 * own CacheService wrapper.
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>("REDIS_URL")?.trim();
        const ttlMs = Number(config.get<string>("CACHE_DEFAULT_TTL_MS") || 60_000);

        if (redisUrl) {
          log.log(
            `Cache backend: Redis (${redisUrl.replace(/:\/\/[^@]*@/, "://***@")})`,
          );
          const secondary = new Keyv({
            store: new KeyvRedis(redisUrl),
            namespace: "evrs",
          });
          // Surface connection errors but don't crash the app — cache failures
          // should degrade to "cache miss", never bring the API down.
          secondary.on("error", (err) =>
            log.warn(`Redis cache error (continuing without cache): ${err}`),
          );
          return {
            stores: new Cacheable({ secondary, ttl: ttlMs }),
          };
        }

        log.log(
          `Cache backend: in-memory (set REDIS_URL=redis://... to enable Redis)`,
        );
        return {
          stores: new Cacheable({ ttl: ttlMs }),
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class AppCacheModule {}

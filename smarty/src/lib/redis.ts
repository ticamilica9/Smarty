import { Redis } from 'ioredis'
import { isPreviewMode } from './preview-mode'

const globalForRedis = globalThis as unknown as { redis: Redis }

// In preview mode, return a mock that no-ops all Redis operations.
// This prevents connection errors when REDIS_URL is unavailable.
function createMockRedis(): Redis {
  const mock = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    publish: async () => 0,
    subscribe: async () => {},
    unsubscribe: async () => {},
    on: () => mock,
    duplicate: () => mock,
  } as unknown as Redis
  return mock
}

function createRealRedis(): Redis {
  return new Redis(process.env.REDIS_URL!)
}

export const redis: Redis = isPreviewMode()
  ? createMockRedis()
  : (globalForRedis.redis || createRealRedis())

export const redisPub: Redis = isPreviewMode()
  ? createMockRedis()
  : redis.duplicate()

export const redisSub: Redis = isPreviewMode()
  ? createMockRedis()
  : redis.duplicate()

if (process.env.NODE_ENV !== 'production' && !isPreviewMode()) {
  globalForRedis.redis = redis
}

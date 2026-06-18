import Redis from 'ioredis';
import { env } from './env.js';

let _redis = null;
let _failed = false;

export function getRedis() {
  if (_failed) return null;
  if (_redis) return _redis;

  try {
    _redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });

    _redis.on('error', (err) => {
      if (!_failed) {
        process.stderr.write(`[redis] Connection failed — caching disabled: ${err.message}\n`);
        _failed = true;
        _redis = null;
      }
    });

    return _redis;
  } catch {
    _failed = true;
    return null;
  }
}

import NodeCache from 'node-cache';
import { redis } from '../config/redis';

// In-memory fallback
const localCache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// Uniform Cache Interface (Adapts both)
export const cache = {
    async get<T>(key: string): Promise<T | undefined> {
        const redisVal = await redis.get(key);
        if (redisVal !== null) {
            try {
                return JSON.parse(redisVal) as T;
            } catch (err) {
                return undefined;
            }
        }
        return localCache.get<T>(key);
    },

    async set(key: string, value: any, ttl?: number): Promise<boolean> {
        const valStr = JSON.stringify(value);
        // Set in both for multi-layer caching, or just stick to one? 
        // For enterprise, Redis is source of truth.
        await redis.set(key, valStr, ttl || 300);
        return localCache.set(key, value, ttl || 300);
    },

    async del(key: string | string[]): Promise<void> {
        const keys = Array.isArray(key) ? key : [key];
        for (const k of keys) {
            await redis.del(k);
            localCache.del(k);
        }
    },

    async keys(): Promise<string[]> {
        // Warning: redis.keys can be slow on very large datasets.
        // For this app, it is used sparingly (e.g. branch list invalidation).
        try {
            const localKeys = localCache.keys();
            const redisKeys = await redis.keys('*');
            return Array.from(new Set([...localKeys, ...redisKeys]));
        } catch (err) {
            console.error("Failed to fetch keys from Redis:", err);
            return localCache.keys();
        }
    }
};


import Redis from 'ioredis';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') {
    dotenv.config();
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisClient {
    private client: Redis | null = null;
    private isConnected: boolean = false;
    private errorLogged: boolean = false;

    constructor() {
        if (process.env.NODE_ENV !== 'test') {
            this.init();
        }
    }

    private init() {
        try {
            this.client = new Redis(REDIS_URL, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) {
                        return null; // Stop retrying after 3 attempts and fail over smoothly
                    }
                    return Math.min(times * 50, 2000);
                },
                reconnectOnError: (err) => {
                    const targetError = 'READONLY';
                    if (err.message.includes(targetError)) {
                        return true;
                    }
                    return false;
                }
            });

            this.client.on('connect', () => {
                this.isConnected = true;
                this.errorLogged = false; // Reset on successful connect
                console.log('✅ Redis Connected');
            });

            this.client.on('error', (err) => {
                this.isConnected = false;
                if (!this.errorLogged) {
                    console.warn('⚠️ Redis connection failed. Falling back to local in-memory cache.');
                    this.errorLogged = true;
                }
            });
        } catch (error) {
            console.error('❌ Redis Initialization Failed:', error);
        }
    }


    public async get(key: string): Promise<string | null> {
        if (!this.isConnected || !this.client) return null;
        try {
            return await this.client.get(key);
        } catch (error) {
            return null;
        }
    }

    public async set(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
        if (!this.isConnected || !this.client) return;
        try {
            await this.client.set(key, value, 'EX', ttlSeconds);
        } catch (error) {
            // Silently fail to DB
        }
    }

    public async del(key: string): Promise<void> {
        if (!this.isConnected || !this.client) return;
        try {
            await this.client.del(key);
        } catch (error) {
            // Silently fail
        }
    }

    public async keys(pattern: string = '*'): Promise<string[]> {
        if (!this.isConnected || !this.client) return [];
        try {
            return await this.client.keys(pattern);
        } catch (error) {
            return [];
        }
    }

    public async flushAll(): Promise<void> {
        if (!this.isConnected || !this.client) return;
        try {
            await this.client.flushall();
        } catch (error) {
            // Silently fail
        }
    }
}

export const redis = new RedisClient();
export default RedisClient;

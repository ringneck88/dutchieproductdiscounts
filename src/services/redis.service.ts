/**
 * Redis Cache Service
 * Handles caching of product-discount pairs for fast lookups
 */

import { createClient, RedisClientType } from 'redis';
import { DutchieProduct, DutchieDiscount } from '../types';

interface CachedDiscount {
  discountId: number;
  discountName: string;
  discountAmount?: number;
  discountType?: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

interface CachedProductDiscount {
  productId: number;
  productName: string;
  productImageUrl: string;
  productBrand: string;
  productPrice: number;
  productCategory: string;
  discounts: CachedDiscount[];
  storeId: string;
  storeName: string;
  lastUpdated: string;
}

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  /**
   * Connect to Redis
   */
  async connect(redisUrl?: string): Promise<void> {
    try {
      const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

      console.log(`Connecting to Redis at ${url}...`);

      this.client = createClient({
        url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis reconnection failed after 10 attempts');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('✓ Redis connected successfully');
      });

      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      console.log('✓ Redis disconnected');
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Cache a product with its discounts
   * Key pattern: product:{storeId}:{productId}
   */
  async cacheProductDiscounts(
    product: DutchieProduct,
    discounts: DutchieDiscount[],
    storeId: string,
    storeName: string
  ): Promise<void> {
    if (!this.isReady()) {
      console.warn('Redis not connected, skipping cache');
      return;
    }

    const key = `product:${storeId}:${product.productId}`;

    const cachedData: CachedProductDiscount = {
      productId: product.productId,
      productName: product.productName,
      productImageUrl: product.imageUrl || '',
      productBrand: product.brandName || '',
      productPrice: product.price || 0,
      productCategory: product.category || '',
      discounts: discounts.map((d) => ({
        discountId: d.discountId,
        discountName: d.discountName,
        discountAmount: d.discountAmount,
        discountType: d.discountType,
        validFrom: d.validFrom,
        validUntil: d.validUntil,
        isActive: d.isActive,
      })),
      storeId,
      storeName,
      lastUpdated: new Date().toISOString(),
    };

    // Calculate TTL: expire when the latest discount expires
    const latestExpiration = discounts.reduce((latest, discount) => {
      const discountExpiration = new Date(discount.validUntil).getTime();
      return Math.max(latest, discountExpiration);
    }, 0);

    const now = Date.now();
    const ttlSeconds = Math.max(0, Math.floor((latestExpiration - now) / 1000));

    try {
      await this.client!.set(key, JSON.stringify(cachedData), {
        EX: ttlSeconds || 86400, // Default 24 hours if no expiration
      });
    } catch (error) {
      console.error(`Error caching product ${product.productId}:`, error);
    }
  }

  /**
   * Get a product with its discounts from cache
   */
  async getProductDiscounts(
    storeId: string,
    productId: number
  ): Promise<CachedProductDiscount | null> {
    if (!this.isReady()) {
      return null;
    }

    const key = `product:${storeId}:${productId}`;

    try {
      const data = await this.client!.get(key);
      if (!data) return null;

      return JSON.parse(data) as CachedProductDiscount;
    } catch (error) {
      console.error(`Error getting product ${productId} from cache:`, error);
      return null;
    }
  }

  /**
   * Get all products with discounts for a store
   * Returns array of product IDs that have cached discounts
   */
  async getStoreProductsWithDiscounts(storeId: string): Promise<CachedProductDiscount[]> {
    if (!this.isReady()) {
      return [];
    }

    try {
      const pattern = `product:${storeId}:*`;
      const keys = await this.client!.keys(pattern);

      if (keys.length === 0) return [];

      const values = await this.client!.mGet(keys);

      return values
        .filter((v): v is string => v !== null)
        .map((v) => JSON.parse(v) as CachedProductDiscount);
    } catch (error) {
      console.error(`Error getting store ${storeId} products:`, error);
      return [];
    }
  }

  /**
   * Get all products with discounts across all stores
   */
  async getAllProductsWithDiscounts(): Promise<CachedProductDiscount[]> {
    if (!this.isReady()) {
      return [];
    }

    try {
      const pattern = 'product:*';
      const keys = await this.client!.keys(pattern);

      if (keys.length === 0) return [];

      const values = await this.client!.mGet(keys);

      return values
        .filter((v): v is string => v !== null)
        .map((v) => JSON.parse(v) as CachedProductDiscount);
    } catch (error) {
      console.error('Error getting all products:', error);
      return [];
    }
  }

  /**
   * Clear all cached products for a store
   */
  async clearStoreCache(storeId: string): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      const pattern = `product:${storeId}:*`;
      const keys = await this.client!.keys(pattern);

      if (keys.length === 0) return 0;

      await this.client!.del(keys);
      return keys.length;
    } catch (error) {
      console.error(`Error clearing cache for store ${storeId}:`, error);
      return 0;
    }
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.client!.flushDb();
      console.log('✓ All cache cleared');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsed: string;
    connectedClients: number;
  }> {
    if (!this.isReady()) {
      return { totalKeys: 0, memoryUsed: '0', connectedClients: 0 };
    }

    try {
      const dbSize = await this.client!.dbSize();
      const info = await this.client!.info('memory');
      const clients = await this.client!.info('clients');

      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';

      // Parse client info
      const clientsMatch = clients.match(/connected_clients:(\d+)/);
      const connectedClients = clientsMatch ? parseInt(clientsMatch[1], 10) : 0;

      return {
        totalKeys: dbSize,
        memoryUsed,
        connectedClients,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalKeys: 0, memoryUsed: '0', connectedClients: 0 };
    }
  }
}

export default new RedisService();

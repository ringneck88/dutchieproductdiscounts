/**
 * Sync Service
 * Coordinates syncing product-discount pairs from Dutchie to Strapi
 * Now supports multiple stores with individual API keys
 */

import DutchieService from './dutchie.service';
import strapiService from './strapi.service';
import storeService from './store.service';
import redisService from './redis.service';
import DiscountService from './discount.service';
import InventoryService from './inventory.service';
import config from '../config';
import { DutchieProduct, DutchieDiscount, ProductDiscount, Store } from '../types';

interface SyncStats {
  totalStores: number;
  totalProducts: number;
  totalDiscounts: number;
  productDiscountPairs: number;
  created: number;
  updated: number;
  deleted: number;
  errors: number;
  storeStats: Map<string, {
    products: number;
    discounts: number;
    pairs: number;
    created: number;
    updated: number;
    errors: number;
  }>;
}

class SyncService {
  /**
   * Main sync method - fetches from Dutchie and syncs to Strapi + Redis
   * Loops through all stores
   */
  async sync(): Promise<SyncStats> {
    console.log('Starting multi-store sync process...');
    console.log('='.repeat(50));

    const stats: SyncStats = {
      totalStores: 0,
      totalProducts: 0,
      totalDiscounts: 0,
      productDiscountPairs: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      storeStats: new Map(),
    };

    try {
      // Connect to Redis if enabled
      if (config.redis.enabled) {
        try {
          await redisService.connect(config.redis.url);
          console.log('✓ Redis cache enabled\n');
        } catch (error) {
          console.warn('⚠️  Redis connection failed, continuing without cache');
          console.warn('   Error:', error);
        }
      } else {
        console.log('ℹ️  Redis cache disabled\n');
      }

      // Fetch all valid stores from Strapi
      const stores = await storeService.getValidStores();
      stats.totalStores = stores.length;

      console.log(`Found ${stores.length} active stores to sync\n`);

      if (stores.length === 0) {
        console.warn('No active stores found with valid Dutchie credentials!');
        return stats;
      }

      // Sync each store
      for (const store of stores) {
        try {
          await this.syncStore(store, stats);
        } catch (error) {
          console.error(`Error syncing store "${store.name}":`, error);
          stats.errors++;
        }
      }

      // Clean up inactive/expired discounts
      console.log('\nCleaning up inactive/expired discounts...');
      const cleanedUp = await strapiService.cleanupInactiveDiscounts();
      stats.deleted += cleanedUp;

      console.log('\n' + '='.repeat(50));
      console.log('Multi-store sync completed successfully!');
      this.printStats(stats);

      // Print Redis cache stats if enabled
      if (config.redis.enabled && redisService.isReady()) {
        const cacheStats = await redisService.getStats();
        console.log('\nRedis Cache Statistics:');
        console.log(`  Cached products: ${cacheStats.totalKeys}`);
        console.log(`  Memory used: ${cacheStats.memoryUsed}`);
      }

      return stats;
    } catch (error) {
      console.error('Error during sync process:', error);
      throw error;
    } finally {
      // Disconnect from Redis
      if (config.redis.enabled && redisService.isReady()) {
        await redisService.disconnect();
      }
    }
  }

  /**
   * Sync a single store's products and discounts
   */
  private async syncStore(store: Store, globalStats: SyncStats): Promise<void> {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Syncing store: ${store.name}`);
    console.log(`${'='.repeat(50)}`);

    // Initialize store-specific stats
    const storeStats = {
      products: 0,
      discounts: 0,
      pairs: 0,
      created: 0,
      updated: 0,
      errors: 0,
    };

    try {
      // Create a Dutchie service instance for this store
      const dutchieService = new DutchieService({
        apiKey: store.dutchieApiKey,
        retailerId: store.dutchieStoreID,
      });

      // Fetch all products and discounts from Dutchie for this store
      const [products, discounts] = await Promise.all([
        dutchieService.getProducts(),
        dutchieService.getDiscounts(),
      ]);

      storeStats.products = products.length;
      storeStats.discounts = discounts.length;
      globalStats.totalProducts += products.length;
      globalStats.totalDiscounts += discounts.length;

      console.log(`Fetched ${products.length} products and ${discounts.length} discounts`);

      // Create a map of discount IDs to discount objects for quick lookup
      const discountMap = new Map<number, DutchieDiscount>();
      discounts.forEach((discount) => {
        discountMap.set(discount.discountId, discount);
      });

      // Process each product and create product-discount pairs
      for (const product of products) {
        const applicableDiscountIds = this.getApplicableDiscounts(product, discounts);

        if (applicableDiscountIds.length === 0) {
          continue; // Skip products with no discounts
        }

        // Get all applicable discounts for this product
        const applicableDiscounts = applicableDiscountIds
          .map(id => discountMap.get(id))
          .filter((d): d is DutchieDiscount => d !== undefined);

        if (applicableDiscounts.length === 0) {
          continue;
        }

        // Cache this product with its discounts in Redis
        if (config.redis.enabled && redisService.isReady()) {
          try {
            await redisService.cacheProductDiscounts(
              product,
              applicableDiscounts,
              store.id?.toString() || store.dutchieStoreID,
              store.name
            );
          } catch (error) {
            console.error(`Error caching product ${product.productId}:`, error);
          }
        }

        // Create a product-discount pair for each discount (Strapi persistence)
        for (const discount of applicableDiscounts) {
          storeStats.pairs++;
          globalStats.productDiscountPairs++;

          try {
            const wasCreated = await this.syncProductDiscountPair(
              product,
              discount,
              store
            );
            if (wasCreated) {
              storeStats.created++;
              globalStats.created++;
            } else {
              storeStats.updated++;
              globalStats.updated++;
            }

            // Log progress every 200 pairs to avoid rate limiting
            if (storeStats.pairs % 200 === 0) {
              console.log(`  Progress: ${storeStats.pairs} pairs synced (${storeStats.created} created, ${storeStats.updated} updated)`);
            }
          } catch (error) {
            console.error(`Error syncing product ${product.productId} with discount ${discount.discountId}:`, error);
            storeStats.errors++;
            globalStats.errors++;
          }
        }
      }

      // Store the stats for this store
      globalStats.storeStats.set(store.name, storeStats);

      console.log(`\nStore "${store.name}" sync complete:`);
      console.log(`  Products: ${storeStats.products}`);
      console.log(`  Discounts: ${storeStats.discounts}`);
      console.log(`  Pairs created: ${storeStats.created}`);
      console.log(`  Pairs updated: ${storeStats.updated}`);
      console.log(`  Errors: ${storeStats.errors}`);
    } catch (error) {
      console.error(`Failed to sync store "${store.name}":`, error);
      throw error;
    }
  }

  /**
   * Get all discount IDs that apply to a given product
   * Based on Dutchie's actual discount filter system
   */
  private getApplicableDiscounts(
    product: DutchieProduct,
    allDiscounts: DutchieDiscount[]
  ): number[] {
    const discountIds = new Set<number>();

    for (const discount of allDiscounts) {
      // Skip inactive discounts
      if (!discount.isActive) {
        continue;
      }

      // Skip if product doesn't allow automatic discounts
      if (product.allowAutomaticDiscounts === false) {
        continue;
      }

      // Check all discount filters
      // Discount filters are objects with { ids: [...], isExclusion: bool } structure
      let matchesAllFilters = true;

      // Check specific products filter
      if (discount.products && discount.products.ids && Array.isArray(discount.products.ids) && discount.products.ids.length > 0) {
        const matches = discount.products.ids.includes(product.productId);
        if (discount.products.isExclusion ? matches : !matches) {
          matchesAllFilters = false;
        }
      }

      // Check brand filter
      if (matchesAllFilters && discount.brands && discount.brands.ids && Array.isArray(discount.brands.ids) && discount.brands.ids.length > 0) {
        if (!product.brandId) {
          matchesAllFilters = false;
        } else {
          const matches = discount.brands.ids.includes(product.brandId);
          if (discount.brands.isExclusion ? matches : !matches) {
            matchesAllFilters = false;
          }
        }
      }

      // Check category filter (categoryId not category name)
      if (matchesAllFilters && discount.productCategories && discount.productCategories.ids && Array.isArray(discount.productCategories.ids) && discount.productCategories.ids.length > 0) {
        if (!product.categoryId) {
          matchesAllFilters = false;
        } else {
          const matches = discount.productCategories.ids.includes(product.categoryId);
          if (discount.productCategories.isExclusion ? matches : !matches) {
            matchesAllFilters = false;
          }
        }
      }

      // Check vendor filter
      if (matchesAllFilters && discount.vendors && discount.vendors.ids && Array.isArray(discount.vendors.ids) && discount.vendors.ids.length > 0) {
        if (!product.vendorId) {
          matchesAllFilters = false;
        } else {
          const matches = discount.vendors.ids.includes(product.vendorId);
          if (discount.vendors.isExclusion ? matches : !matches) {
            matchesAllFilters = false;
          }
        }
      }

      // Check strain filter
      if (matchesAllFilters && discount.strains && discount.strains.ids && Array.isArray(discount.strains.ids) && discount.strains.ids.length > 0) {
        if (!product.strainId) {
          matchesAllFilters = false;
        } else {
          const matches = discount.strains.ids.includes(product.strainId);
          if (discount.strains.isExclusion ? matches : !matches) {
            matchesAllFilters = false;
          }
        }
      }

      // Check tags filter (tags might still be simple arrays)
      if (matchesAllFilters && discount.tags && discount.tags.ids && Array.isArray(discount.tags.ids) && discount.tags.ids.length > 0) {
        if (!product.tags || !Array.isArray(product.tags) || product.tags.length === 0) {
          matchesAllFilters = false;
        } else {
          const hasMatchingTag = discount.tags.ids.some(tag => product.tags!.includes(tag));
          if (discount.tags.isExclusion ? hasMatchingTag : !hasMatchingTag) {
            matchesAllFilters = false;
          }
        }
      }

      // If all filters passed (or no filters were set), this discount applies
      if (matchesAllFilters) {
        discountIds.add(discount.discountId);
      }
    }

    return Array.from(discountIds);
  }

  /**
   * Sync a single product-discount pair to Strapi
   * Returns true if created, false if updated
   */
  private async syncProductDiscountPair(
    product: DutchieProduct,
    discount: DutchieDiscount,
    store: Store
  ): Promise<boolean> {
    // Check if this pair already exists in Strapi
    const existing = await strapiService.findProductDiscount(
      product.productId.toString(),
      discount.discountId.toString()
    );

    // Prepare the data
    const data: ProductDiscount = {
      productName: product.productName,
      productDutchieId: product.productId.toString(),
      productDescription: product.description || '',
      productImageUrl: product.imageUrl || '',
      productBrand: product.brandName || '',
      discountName: discount.discountName,
      discountBrand: '', // Discounts don't have a direct brand name field
      discountImageUrl: '', // Discounts don't have image URLs in the API
      discountStartTimestamp: this.normalizeTimestamp(discount.validFrom),
      discountEndTimestamp: this.normalizeTimestamp(discount.validUntil),
      discountIsActive: discount.isActive,
      discountDutchieId: discount.discountId.toString(),
      storeId: store.id?.toString() || store.dutchieStoreID,
      storeName: store.name,
      storeLocation: store.location || '',
    };

    if (existing) {
      // Update existing entry
      const updated = await strapiService.updateProductDiscount(existing.id!, data);

      // If update returns null (record was deleted), create a new one
      if (updated === null) {
        await strapiService.createProductDiscount(data);
        return true;
      }

      return false;
    } else {
      // Create new entry
      await strapiService.createProductDiscount(data);
      return true;
    }
  }

  /**
   * Normalize timestamp to ISO string format
   */
  private normalizeTimestamp(timestamp: string | number): string {
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toISOString();
    }
    return new Date(timestamp).toISOString();
  }

  /**
   * Print sync statistics
   */
  private printStats(stats: SyncStats): void {
    console.log('\nOverall Sync Statistics:');
    console.log(`  Total stores synced: ${stats.totalStores}`);
    console.log(`  Total products fetched: ${stats.totalProducts}`);
    console.log(`  Total discounts fetched: ${stats.totalDiscounts}`);
    console.log(`  Total product-discount pairs: ${stats.productDiscountPairs}`);
    console.log(`  Total created in Strapi: ${stats.created}`);
    console.log(`  Total updated in Strapi: ${stats.updated}`);
    console.log(`  Total deleted from Strapi: ${stats.deleted}`);
    console.log(`  Total errors: ${stats.errors}`);

    if (stats.storeStats.size > 0) {
      console.log('\nPer-Store Breakdown:');
      stats.storeStats.forEach((storeStats, storeName) => {
        console.log(`  ${storeName}:`);
        console.log(`    Products: ${storeStats.products}, Discounts: ${storeStats.discounts}`);
        console.log(`    Pairs: ${storeStats.pairs} (Created: ${storeStats.created}, Updated: ${storeStats.updated})`);
        if (storeStats.errors > 0) {
          console.log(`    Errors: ${storeStats.errors}`);
        }
      });
    }
  }

  /**
   * Sync discounts from Dutchie /reporting/discounts endpoint to Strapi
   * This syncs full discount data including all fields and metadata
   */
  async syncDiscounts(): Promise<{
    totalStores: number;
    totalDiscounts: number;
    created: number;
    updated: number;
    deleted: number;
    errors: number;
  }> {
    console.log('\n🔄 Starting discount sync from Dutchie /reporting/discounts...');
    console.log('='.repeat(50));

    const stats = {
      totalStores: 0,
      totalDiscounts: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
    };

    try {
      const discountService = new DiscountService();

      // Fetch all valid stores from Strapi
      const stores = await storeService.getValidStores();
      stats.totalStores = stores.length;

      console.log(`Found ${stores.length} active stores to sync\n`);

      if (stores.length === 0) {
        console.warn('No active stores found with valid Dutchie credentials!');
        return stats;
      }

      const allActiveDiscountIds: number[] = [];

      // Sync discounts for each store
      for (const store of stores) {
        console.log(`\nSyncing discounts for store: ${store.name}`);
        console.log('-'.repeat(50));

        try {
          // Create Dutchie service instance for this store
          const dutchieService = new DutchieService({
            apiKey: store.dutchieApiKey,
            retailerId: store.dutchieStoreID,
          });

          // Fetch discounts from Dutchie Reporting API
          const allDiscounts = await dutchieService.getReportingDiscounts();
          console.log(`  Fetched ${allDiscounts.length} total discounts from Dutchie`);

          // Filter out inactive, deleted, and expired discounts
          const now = new Date();
          const activeDiscounts = allDiscounts.filter(discount => {
            // Skip if not active
            if (discount.isActive === false) return false;

            // Skip if deleted
            if (discount.isDeleted === true) return false;

            // Skip if expired (validUntil is in the past)
            if (discount.validUntil) {
              const validUntil = new Date(discount.validUntil);
              if (validUntil < now) return false;
            }

            return true;
          });

          console.log(`  Filtered to ${activeDiscounts.length} active, non-deleted, non-expired discounts`);
          stats.totalDiscounts += activeDiscounts.length;

          // Sync each active discount to Strapi with batched progress logging
          let processedCount = 0;
          const storeInfo = {
            storeId: store.id!,
            storeName: store.name,
            dutchieStoreID: store.dutchieStoreID,
          };

          for (const discount of activeDiscounts) {
            try {
              await discountService.upsertDiscount(discount, storeInfo);
              allActiveDiscountIds.push(discount.discountId);
              processedCount++;

              // Log progress every 50 items to avoid rate limiting
              if (processedCount % 50 === 0) {
                console.log(`  Progress: ${processedCount}/${activeDiscounts.length} discounts synced`);
              }
            } catch (error) {
              console.error(`  Error syncing discount ${discount.discountId}:`, error);
              stats.errors++;
            }
          }

          console.log(`  ✓ Completed sync for ${store.name}: ${processedCount} discounts`);
        } catch (error) {
          console.error(`  Error syncing store "${store.name}":`, error);
          stats.errors++;
        }
      }

      // Clean up discounts that are no longer active
      console.log('\nCleaning up inactive discounts...');
      const deleted = await discountService.deleteInactiveDiscounts(allActiveDiscountIds);
      stats.deleted = deleted;

      console.log('\n' + '='.repeat(50));
      console.log('✅ Discount sync completed!');
      console.log('\nDiscount Sync Statistics:');
      console.log(`  Total stores synced: ${stats.totalStores}`);
      console.log(`  Total discounts fetched: ${stats.totalDiscounts}`);
      console.log(`  Deleted inactive: ${stats.deleted}`);
      console.log(`  Errors: ${stats.errors}`);

      return stats;
    } catch (error) {
      console.error('Error during discount sync process:', error);
      throw error;
    }
  }

  /**
   * Sync inventory from Dutchie Reporting API to Strapi
   * Fetches inventory data from /reporting/inventory endpoint for all stores
   */
  async syncInventory(): Promise<{
    totalStores: number;
    totalInventory: number;
    created: number;
    updated: number;
    deleted: number;
    errors: number;
  }> {
    console.log('\n🔄 Starting inventory sync from Dutchie /reporting/inventory...');
    console.log('='.repeat(50));

    const stats = {
      totalStores: 0,
      totalInventory: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
    };

    try {
      const inventoryService = new InventoryService();

      // Fetch all valid stores from Strapi
      const stores = await storeService.getValidStores();
      stats.totalStores = stores.length;

      console.log(`Found ${stores.length} active stores to sync\n`);

      if (stores.length === 0) {
        console.warn('No active stores found with valid Dutchie credentials!');
        return stats;
      }

      const allActiveInventoryIds: number[] = [];

      // Sync inventory for each store
      for (const store of stores) {
        console.log(`\nSyncing inventory for store: ${store.name}`);
        console.log('-'.repeat(50));

        try {
          // Create Dutchie service instance for this store
          const dutchieService = new DutchieService({
            apiKey: store.dutchieApiKey,
            retailerId: store.dutchieStoreID,
          });

          // Fetch inventory from Dutchie Reporting API
          const inventory = await dutchieService.getReportingInventory();
          console.log(`  Fetched ${inventory.length} inventory items from Dutchie`);

          stats.totalInventory += inventory.length;

          // Sync each inventory item to Strapi with batched progress logging
          let processedCount = 0;
          const storeInfo = {
            storeId: store.id!,
            storeName: store.name,
            dutchieStoreID: store.dutchieStoreID,
          };

          for (const item of inventory) {
            try {
              await inventoryService.upsertInventory(item, storeInfo);
              allActiveInventoryIds.push(item.inventoryId);
              processedCount++;

              // Log progress every 100 items to avoid rate limiting
              if (processedCount % 100 === 0) {
                console.log(`  Progress: ${processedCount}/${inventory.length} items synced`);
              }
            } catch (error) {
              console.error(`  Error syncing inventory ${item.inventoryId}:`, error);
              stats.errors++;
            }
          }

          console.log(`  ✓ Completed sync for ${store.name}: ${processedCount} items`);
        } catch (error) {
          console.error(`  Error syncing store "${store.name}":`, error);
          stats.errors++;
        }
      }

      // Clean up inventory items that are no longer active
      console.log('\nCleaning up inactive inventory...');
      const deleted = await inventoryService.deleteInactiveInventory(allActiveInventoryIds);
      stats.deleted = deleted;

      console.log('\n' + '='.repeat(50));
      console.log('✅ Inventory sync completed!');
      console.log('\nInventory Sync Statistics:');
      console.log(`  Total stores synced: ${stats.totalStores}`);
      console.log(`  Total inventory items fetched: ${stats.totalInventory}`);
      console.log(`  Deleted inactive: ${stats.deleted}`);
      console.log(`  Errors: ${stats.errors}`);

      return stats;
    } catch (error) {
      console.error('Error during inventory sync process:', error);
      throw error;
    }
  }
}

export default new SyncService();

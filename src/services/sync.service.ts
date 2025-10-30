/**
 * Sync Service
 * Coordinates syncing product-discount pairs from Dutchie to Strapi
 * Now supports multiple stores with individual API keys
 */

import DutchieService from './dutchie.service';
import strapiService from './strapi.service';
import storeService from './store.service';
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
   * Main sync method - fetches from Dutchie and syncs to Strapi
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

      return stats;
    } catch (error) {
      console.error('Error during sync process:', error);
      throw error;
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
        retailerId: store.dutchieRetailerId,
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
      const discountMap = new Map<string, DutchieDiscount>();
      discounts.forEach((discount) => {
        discountMap.set(discount.id, discount);
      });

      // Process each product and create product-discount pairs
      for (const product of products) {
        const applicableDiscountIds = this.getApplicableDiscounts(product, discounts);

        if (applicableDiscountIds.length === 0) {
          continue; // Skip products with no discounts
        }

        // Create a product-discount pair for each discount
        for (const discountId of applicableDiscountIds) {
          const discount = discountMap.get(discountId);

          if (!discount) {
            console.warn(`Discount ${discountId} not found for product ${product.id}`);
            continue;
          }

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
          } catch (error) {
            console.error(`Error syncing product ${product.id} with discount ${discount.id}:`, error);
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
   */
  private getApplicableDiscounts(
    product: DutchieProduct,
    allDiscounts: DutchieDiscount[]
  ): string[] {
    const discountIds = new Set<string>();

    // Check if product has discounts directly attached
    if (product.discounts && Array.isArray(product.discounts)) {
      product.discounts.forEach((id) => discountIds.add(id));
    }

    // Check if any discounts apply to this product
    for (const discount of allDiscounts) {
      // Skip inactive discounts
      if (!discount.isActive) {
        continue;
      }

      // Check if discount applies to this product
      if (
        discount.applicableProducts &&
        Array.isArray(discount.applicableProducts) &&
        discount.applicableProducts.includes(product.id)
      ) {
        discountIds.add(discount.id);
      }

      // If no specific products listed, discount might apply to all products
      // (Adjust this logic based on actual Dutchie API behavior)
      if (
        !discount.applicableProducts ||
        discount.applicableProducts.length === 0
      ) {
        // Check if discount brand matches product brand
        if (discount.brand && product.brand && discount.brand === product.brand) {
          discountIds.add(discount.id);
        }
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
      product.id,
      discount.id
    );

    // Prepare the data
    const data: ProductDiscount = {
      productName: product.name,
      productDutchieId: product.id,
      productDescription: product.description || '',
      productImageUrl: product.image || '',
      productBrand: product.brand || '',
      discountName: discount.name,
      discountBrand: discount.brand || '',
      discountImageUrl: discount.image || '',
      discountStartTimestamp: this.normalizeTimestamp(discount.startTime),
      discountEndTimestamp: this.normalizeTimestamp(discount.endTime),
      discountIsActive: discount.isActive,
      discountDutchieId: discount.id,
      storeId: store.id?.toString() || store.dutchieRetailerId,
      storeName: store.name,
      storeLocation: store.location || '',
    };

    if (existing) {
      // Update existing entry
      await strapiService.updateProductDiscount(existing.id!, data);
      console.log(`Updated: ${product.name} - ${discount.name}`);
      return false;
    } else {
      // Create new entry
      await strapiService.createProductDiscount(data);
      console.log(`Created: ${product.name} - ${discount.name}`);
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
}

export default new SyncService();

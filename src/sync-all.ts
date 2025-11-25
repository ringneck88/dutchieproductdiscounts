/**
 * Combined Sync Script
 * Syncs both inventory and discounts from Dutchie to Strapi
 * Uses direct PostgreSQL when DATABASE_URL is configured (much faster)
 */

import config, { validateConfig } from './config';
import DutchieService from './services/dutchie.service';
import InventoryService from './services/inventory.service';
import DiscountService from './services/discount.service';
import databaseService from './services/database.service';
import storeService from './services/store.service';

async function syncAll() {
  console.log('Combined Inventory + Discount Sync Tool');
  console.log('=======================================\n');

  const startTime = Date.now();

  try {
    // Check if direct database mode is enabled
    const useDirectDb = config.database.enabled;

    let stores: Array<{
      id?: number;
      name: string;
      dutchieStoreID: string;
      dutchieApiKey: string;
      location?: string;
    }>;

    if (useDirectDb) {
      console.log('🚀 Using DIRECT DATABASE mode (PostgreSQL) - much faster!');
      console.log(`   DATABASE_URL: ${config.database.url.substring(0, 30)}...\n`);
      await databaseService.connect();

      // Fetch stores directly from database (bypasses Strapi API)
      console.log('Fetching stores from database...');
      stores = await databaseService.getStores();
    } else {
      // Validate configuration (requires Strapi token)
      console.log('Validating configuration...');
      validateConfig();
      console.log('Configuration valid!\n');

      console.log('⚠️  Using Strapi API mode (SLOW)');
      console.log('   Set DATABASE_URL environment variable for 100x faster sync!\n');

      // Fetch stores from Strapi API
      console.log('Fetching stores from Strapi...');
      stores = await storeService.getValidStores();
    }

    if (stores.length === 0) {
      console.error('No valid stores found. Please configure stores with Dutchie API credentials.');
      return;
    }

    console.log(`Found ${stores.length} valid store(s) to sync\n`);

    // Track totals
    let totalInventorySynced = 0;
    let totalDiscountsSynced = 0;

    // Sync stores SEQUENTIALLY to avoid race conditions
    const storeResults: { storeName: string; invSynced: number; discSynced: number; invErrors: number; discErrors: number }[] = [];

    try {
      for (const store of stores) {
        const result = { storeName: store.name, invSynced: 0, discSynced: 0, invErrors: 0, discErrors: 0 };

        console.log(`\n🚀 Starting sync for: ${store.name} (ID: ${store.dutchieStoreID})`);

        try {
          // Initialize Dutchie service for this store
          const dutchieService = new DutchieService({
            apiKey: store.dutchieApiKey,
            retailerId: store.dutchieStoreID,
          });

          const storeInfo = {
            storeId: store.id!,
            storeName: store.name,
            dutchieStoreID: store.dutchieStoreID,
          };

          // Fetch inventory and discounts in parallel (safe - just reading from Dutchie)
          const [inventoryItems, discounts] = await Promise.all([
            dutchieService.getReportingInventory(),
            dutchieService.getReportingDiscounts(),
          ]);

          console.log(`[${store.name}] Fetched ${inventoryItems.length} inventory, ${discounts.length} discounts`);

          if (useDirectDb) {
            // Direct database mode - much faster
            const invResult = await databaseService.bulkUpsertInventory(inventoryItems, storeInfo);
            const discResult = await databaseService.bulkUpsertDiscounts(discounts, storeInfo);

            result.invSynced = invResult.created;
            result.invErrors = invResult.errors;
            result.discSynced = discResult.created;
            result.discErrors = discResult.errors;
          } else {
            // Strapi API mode
            const inventoryService = new InventoryService();
            const discountService = new DiscountService();

            const invResult = await inventoryService.bulkReplaceInventory(inventoryItems, storeInfo)
              .then(r => ({ synced: r.created, errors: r.errors }))
              .catch(() => ({ synced: 0, errors: 1 }));

            const discResult = await discountService.bulkReplaceDiscounts(discounts, storeInfo)
              .then(r => ({ synced: r.created, errors: r.errors }))
              .catch(() => ({ synced: 0, errors: 1 }));

            result.invSynced = invResult.synced;
            result.invErrors = invResult.errors;
            result.discSynced = discResult.synced;
            result.discErrors = discResult.errors;
          }

          console.log(`✅ [${store.name}] Complete: ${result.invSynced} inventory, ${result.discSynced} discounts`);

        } catch (storeError) {
          console.error(`❌ Error syncing store "${store.name}":`, storeError);
        }

        storeResults.push(result);
      }
    } finally {
      if (useDirectDb) {
        await databaseService.disconnect();
      }
    }

    // Aggregate results
    for (const result of storeResults) {
      totalInventorySynced += result.invSynced;
      totalDiscountsSynced += result.discSynced;
    }

    // Final summary
    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(1);

    console.log(`\n${'═'.repeat(70)}`);
    console.log('✅ SYNC COMPLETED!');
    console.log('═'.repeat(70));
    console.log(`\nResults:`);
    console.log(`  📦 Total inventory synced: ${totalInventorySynced}`);
    console.log(`  🏷️  Total discounts synced: ${totalDiscountsSynced}`);
    console.log(`  🏪 Stores processed: ${stores.length}`);
    console.log(`  ⏱️  Duration: ${durationSeconds}s`);
    console.log('═'.repeat(70));

    return { totalInventorySynced, totalDiscountsSynced };

  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  }
}

/**
 * Run sync with scheduled interval
 */
async function runWithSchedule() {
  console.log('Combined Inventory + Discount Sync Tool (Scheduled)');
  console.log('===================================================\n');

  // Run initial sync
  await syncAll();

  // Check if interval is configured
  const intervalMinutes = config.sync.intervalMinutes;

  if (intervalMinutes && intervalMinutes > 0) {
    console.log(`\n🔄 Scheduled to run every ${intervalMinutes} minutes`);
    console.log('Press Ctrl+C to stop\n');

    setInterval(async () => {
      console.log(`\n[${new Date().toISOString()}] Running scheduled sync...`);
      try {
        await syncAll();
        console.log('✅ Scheduled sync completed!');
      } catch (error) {
        console.error('Scheduled sync failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  } else {
    console.log('\nNo SYNC_INTERVAL configured. Exiting...');
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Run if executed directly
if (require.main === module) {
  runWithSchedule().catch((error) => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });
}

export { syncAll, runWithSchedule };
export default syncAll;

/**
 * Combined Sync Script
 * Syncs both inventory and discounts from Dutchie to Strapi
 */

import config, { validateConfig } from './config';
import DutchieService from './services/dutchie.service';
import InventoryService from './services/inventory.service';
import DiscountService from './services/discount.service';
import storeService from './services/store.service';

async function syncAll() {
  console.log('Combined Inventory + Discount Sync Tool');
  console.log('=======================================\n');

  const startTime = Date.now();

  try {
    // Validate configuration
    console.log('Validating configuration...');
    validateConfig();
    console.log('Configuration valid!\n');

    // Fetch valid stores from Strapi
    console.log('Fetching stores from Strapi...');
    const stores = await storeService.getValidStores();

    if (stores.length === 0) {
      console.error('No valid stores found in Strapi. Please configure stores with Dutchie API credentials.');
      return;
    }

    console.log(`Found ${stores.length} valid store(s) to sync\n`);

    // Track totals
    let totalInventorySynced = 0;
    let totalDiscountsSynced = 0;

    for (const store of stores) {
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`STORE: ${store.name} (ID: ${store.DutchieStoreID})`);
      console.log('═'.repeat(70));

      try {
        // Initialize services for this store
        const dutchieService = new DutchieService({
          apiKey: store.dutchieApiKey,
          retailerId: store.DutchieStoreID,
        });

        const inventoryService = new InventoryService();
        const discountService = new DiscountService();

        const storeInfo = {
          storeId: store.id!,
          storeName: store.name,
          DutchieStoreID: store.DutchieStoreID,
        };

        // ===== SYNC INVENTORY =====
        console.log('\n📦 Syncing Inventory...');
        console.log('─'.repeat(50));

        const inventoryItems = await dutchieService.getReportingInventory();
        console.log(`Found ${inventoryItems.length} inventory items`);

        let invSynced = 0;
        let invErrors = 0;

        for (const item of inventoryItems) {
          try {
            await inventoryService.upsertInventory(item, storeInfo);
            invSynced++;

            if (invSynced % 100 === 0) {
              console.log(`  Inventory: ${invSynced}/${inventoryItems.length} (${((invSynced/inventoryItems.length)*100).toFixed(1)}%)`);
            }
          } catch (error) {
            invErrors++;
            if (invErrors <= 3) {
              console.error(`  Error syncing inventory ${item.inventoryId}:`, error);
            }
          }
        }

        console.log(`✅ Inventory: ${invSynced}/${inventoryItems.length} synced${invErrors > 0 ? `, ${invErrors} errors` : ''}`);
        totalInventorySynced += invSynced;

        // ===== SYNC DISCOUNTS =====
        console.log('\n🏷️  Syncing Discounts...');
        console.log('─'.repeat(50));

        const discounts = await dutchieService.getReportingDiscounts();
        console.log(`Found ${discounts.length} discounts`);

        let discSynced = 0;
        let discErrors = 0;

        for (const discount of discounts) {
          try {
            await discountService.upsertDiscount(discount, storeInfo);
            discSynced++;

            if (discSynced % 50 === 0) {
              console.log(`  Discounts: ${discSynced}/${discounts.length} (${((discSynced/discounts.length)*100).toFixed(1)}%)`);
            }
          } catch (error) {
            discErrors++;
            if (discErrors <= 3) {
              console.error(`  Error syncing discount ${discount.discountId}:`, error);
            }
          }
        }

        console.log(`✅ Discounts: ${discSynced}/${discounts.length} synced${discErrors > 0 ? `, ${discErrors} errors` : ''}`);
        totalDiscountsSynced += discSynced;

      } catch (storeError) {
        console.error(`❌ Error syncing store "${store.name}":`, storeError);
      }
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

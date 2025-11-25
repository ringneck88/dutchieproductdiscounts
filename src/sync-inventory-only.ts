/**
 * Inventory-Only Sync Script
 * Syncs inventory from Dutchie Reporting API to Strapi inventories collection
 */

import config, { validateConfig } from './config';
import DutchieService from './services/dutchie.service';
import InventoryService from './services/inventory.service';
import storeService from './services/store.service';

async function syncInventoryOnly() {
  console.log('Inventory-Only Sync Tool');
  console.log('========================\n');

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

    // Sync stores SEQUENTIALLY to avoid race conditions
    const storeResults: { storeName: string; synced: number; errors: number }[] = [];

    for (const store of stores) {
      console.log(`\n🚀 Starting inventory sync for: ${store.name} (ID: ${store.dutchieStoreID})`);

      try {
        // Initialize Dutchie service for this store
        const dutchieService = new DutchieService({
          apiKey: store.dutchieApiKey,
          retailerId: store.dutchieStoreID,
        });

        // Initialize Inventory service
        const inventoryService = new InventoryService();

        // Fetch inventory from Dutchie
        const inventoryItems = await dutchieService.getReportingInventory();

        if (inventoryItems.length === 0) {
          console.log(`[${store.name}] No inventory items found`);
          storeResults.push({ storeName: store.name, synced: 0, errors: 0 });
          continue;
        }

        console.log(`[${store.name}] Fetched ${inventoryItems.length} inventory items`);

        // Store info to associate with inventory items
        const storeInfo = {
          storeId: store.id!,
          storeName: store.name,
          dutchieStoreID: store.dutchieStoreID,
        };

        // Bulk replace inventory
        const result = await inventoryService.bulkReplaceInventory(inventoryItems, storeInfo);

        console.log(`✅ [${store.name}] Complete: ${result.created} created, ${result.deleted} deleted${result.errors > 0 ? `, ${result.errors} errors` : ''}`);

        storeResults.push({ storeName: store.name, synced: result.created, errors: result.errors });

      } catch (storeError) {
        console.error(`❌ Error syncing store "${store.name}":`, storeError);
        storeResults.push({ storeName: store.name, synced: 0, errors: 1 });
      }
    }

    // Aggregate results
    const totalInventorySynced = storeResults.reduce((sum, r) => sum + r.synced, 0);

    // Final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Inventory sync completed!');
    console.log('='.repeat(60));
    console.log(`Total inventory items synced: ${totalInventorySynced}`);
    console.log(`Stores processed: ${stores.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  syncInventoryOnly()
    .then(() => {
      console.log('\n✅ Sync completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Sync failed:', error);
      process.exit(1);
    });
}

export default syncInventoryOnly;

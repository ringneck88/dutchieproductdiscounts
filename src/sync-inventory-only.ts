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

    // Sync all stores in parallel
    const storeResults = await Promise.all(
      stores.map(async (store) => {
        console.log(`🚀 Starting inventory sync for: ${store.name} (ID: ${store.dutchieStoreID})`);

        let syncedCount = 0;
        let errorCount = 0;

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
            return { storeName: store.name, synced: 0, errors: 0 };
          }

          console.log(`[${store.name}] Fetched ${inventoryItems.length} inventory items`);

          // Store info to associate with inventory items
          const storeInfo = {
            storeId: store.id!,
            storeName: store.name,
            dutchieStoreID: store.dutchieStoreID,
          };

          // Sync each inventory item to Strapi
          for (const item of inventoryItems) {
            try {
              await inventoryService.upsertInventory(item, storeInfo);
              syncedCount++;
            } catch (error) {
              errorCount++;
            }
          }

          console.log(`✅ [${store.name}] Complete: ${syncedCount}/${inventoryItems.length} synced${errorCount > 0 ? `, ${errorCount} errors` : ''}`);

        } catch (storeError) {
          console.error(`❌ Error syncing store "${store.name}":`, storeError);
        }

        return { storeName: store.name, synced: syncedCount, errors: errorCount };
      })
    );

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

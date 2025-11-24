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

    // Sync inventory for each store
    let totalInventorySynced = 0;

    for (const store of stores) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Syncing inventory for: ${store.name} (ID: ${store.DutchieStoreID})`);
      console.log('='.repeat(60));

      try {
        // Initialize Dutchie service for this store
        const dutchieService = new DutchieService({
          apiKey: store.dutchieApiKey,
          retailerId: store.DutchieStoreID,
        });

        // Initialize Inventory service
        const inventoryService = new InventoryService();

        // Fetch inventory from Dutchie
        console.log('Fetching inventory from Dutchie...');
        const inventoryItems = await dutchieService.getReportingInventory();

        if (inventoryItems.length === 0) {
          console.log('No inventory items found for this store');
          continue;
        }

        console.log(`Found ${inventoryItems.length} inventory items\n`);

        // Store info to associate with inventory items
        const storeInfo = {
          storeId: store.id!,  // Non-null assertion since stores from Strapi always have IDs
          storeName: store.name,
          DutchieStoreID: store.DutchieStoreID,
        };

        // Debug: Log store info to verify DutchieStoreID is populated
        console.log('DEBUG Store object keys:', Object.keys(store));
        console.log('DEBUG store.DutchieStoreID:', store.DutchieStoreID);
        console.log('DEBUG store.dutchieStoreID:', (store as any).dutchieStoreID);
        console.log('DEBUG storeInfo:', JSON.stringify(storeInfo, null, 2));

        // Sync each inventory item to Strapi
        console.log('Syncing inventory items to Strapi...');
        let syncedCount = 0;
        let errorCount = 0;

        for (const item of inventoryItems) {
          try {
            await inventoryService.upsertInventory(item, storeInfo);
            syncedCount++;

            // Log progress every 100 items
            if (syncedCount % 100 === 0) {
              console.log(`  Progress: ${syncedCount}/${inventoryItems.length} (${((syncedCount/inventoryItems.length)*100).toFixed(1)}%)`);
            }
          } catch (error) {
            errorCount++;
            if (errorCount <= 5) {
              console.error(`  Error syncing inventory item ${item.inventoryId}:`, error);
            }
          }
        }

        console.log(`\n✅ Store "${store.name}" sync complete:`);
        console.log(`   Synced: ${syncedCount}/${inventoryItems.length}`);
        if (errorCount > 0) {
          console.log(`   Errors: ${errorCount}`);
        }

        totalInventorySynced += syncedCount;

      } catch (storeError) {
        console.error(`❌ Error syncing store "${store.name}":`, storeError);
      }
    }

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

/**
 * Discount-Only Sync Script
 * Syncs discounts from Dutchie Reporting API to Strapi discounts collection
 */

import config, { validateConfig } from './config';
import DutchieService from './services/dutchie.service';
import DiscountService from './services/discount.service';
import storeService from './services/store.service';

async function syncDiscountsOnly() {
  console.log('Discount-Only Sync Tool');
  console.log('=======================\n');

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

    // Sync discounts for each store
    let totalDiscountsSynced = 0;

    for (const store of stores) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Syncing discounts for: ${store.name} (ID: ${store.DutchieStoreID})`);
      console.log('='.repeat(60));

      try {
        // Initialize Dutchie service for this store
        const dutchieService = new DutchieService({
          apiKey: store.dutchieApiKey,
          retailerId: store.DutchieStoreID,
        });

        // Initialize Discount service
        const discountService = new DiscountService();

        // Fetch discounts from Dutchie Reporting API
        console.log('Fetching discounts from Dutchie...');
        const discounts = await dutchieService.getReportingDiscounts();

        if (discounts.length === 0) {
          console.log('No discounts found for this store');
          continue;
        }

        console.log(`Found ${discounts.length} discounts\n`);

        // Store info to associate with discounts
        const storeInfo = {
          storeId: store.id!,
          storeName: store.name,
          DutchieStoreID: store.DutchieStoreID,
        };

        // Sync each discount to Strapi
        console.log('Syncing discounts to Strapi...');
        let syncedCount = 0;
        let errorCount = 0;

        for (const discount of discounts) {
          try {
            await discountService.upsertDiscount(discount, storeInfo);
            syncedCount++;

            // Log progress every 50 items
            if (syncedCount % 50 === 0) {
              console.log(`  Progress: ${syncedCount}/${discounts.length} (${((syncedCount/discounts.length)*100).toFixed(1)}%)`);
            }
          } catch (error) {
            errorCount++;
            if (errorCount <= 5) {
              console.error(`  Error syncing discount ${discount.discountId}:`, error);
            }
          }
        }

        console.log(`\n✅ Store "${store.name}" discount sync complete:`);
        console.log(`   Synced: ${syncedCount}/${discounts.length}`);
        if (errorCount > 0) {
          console.log(`   Errors: ${errorCount}`);
        }

        totalDiscountsSynced += syncedCount;

      } catch (storeError) {
        console.error(`❌ Error syncing store "${store.name}":`, storeError);
      }
    }

    // Final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Discount sync completed!');
    console.log('='.repeat(60));
    console.log(`Total discounts synced: ${totalDiscountsSynced}`);
    console.log(`Stores processed: ${stores.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  syncDiscountsOnly()
    .then(() => {
      console.log('\n✅ Sync completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Sync failed:', error);
      process.exit(1);
    });
}

export default syncDiscountsOnly;

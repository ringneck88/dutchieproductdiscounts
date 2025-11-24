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

    // Sync all stores in parallel
    const storeResults = await Promise.all(
      stores.map(async (store) => {
        console.log(`🚀 Starting discount sync for: ${store.name} (ID: ${store.dutchieStoreID})`);

        let syncedCount = 0;
        let errorCount = 0;

        try {
          // Initialize Dutchie service for this store
          const dutchieService = new DutchieService({
            apiKey: store.dutchieApiKey,
            retailerId: store.dutchieStoreID,
          });

          // Initialize Discount service
          const discountService = new DiscountService();

          // Fetch discounts from Dutchie Reporting API
          const discounts = await dutchieService.getReportingDiscounts();

          if (discounts.length === 0) {
            console.log(`[${store.name}] No discounts found`);
            return { storeName: store.name, synced: 0, errors: 0 };
          }

          console.log(`[${store.name}] Fetched ${discounts.length} discounts`);

          // Store info to associate with discounts
          const storeInfo = {
            storeId: store.id!,
            storeName: store.name,
            dutchieStoreID: store.dutchieStoreID,
          };

          // Sync each discount to Strapi
          for (const discount of discounts) {
            try {
              await discountService.upsertDiscount(discount, storeInfo);
              syncedCount++;
            } catch (error) {
              errorCount++;
            }
          }

          console.log(`✅ [${store.name}] Complete: ${syncedCount}/${discounts.length} synced${errorCount > 0 ? `, ${errorCount} errors` : ''}`);

        } catch (storeError) {
          console.error(`❌ Error syncing store "${store.name}":`, storeError);
        }

        return { storeName: store.name, synced: syncedCount, errors: errorCount };
      })
    );

    // Aggregate results
    const totalDiscountsSynced = storeResults.reduce((sum, r) => sum + r.synced, 0);

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

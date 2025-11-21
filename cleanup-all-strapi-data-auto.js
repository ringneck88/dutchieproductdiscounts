/**
 * Comprehensive Cleanup Script: Delete all inventory, products, and product-discounts
 * Auto-confirm version (no prompts)
 *
 * This removes ALL data from:
 * - Inventories collection
 * - Product-discounts collection
 *
 * WARNING: This will delete all data from these collections!
 * The discount collection type structure will remain intact.
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.STRAPI_API_URL || 'https://mintdealsbackend-production.up.railway.app';
const TOKEN = process.env.STRAPI_API_TOKEN;

if (!TOKEN) {
  console.error('❌ Error: STRAPI_API_TOKEN not found in environment variables');
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function getCollectionCount(collection) {
  try {
    const response = await client.get(`/api/${collection}`, {
      params: { pagination: { pageSize: 1 } }
    });
    return response.data.meta?.pagination?.total || 0;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`  ℹ️  ${collection} collection not found (might not exist)`);
      return 0;
    }
    console.error(`  ⚠️  Error getting ${collection} count:`, error.response?.status || error.message);
    return 0;
  }
}

async function deleteCollection(collectionName) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🗑️  Deleting ${collectionName}...`);
  console.log('─'.repeat(60));

  // Check current count
  const totalCount = await getCollectionCount(collectionName);
  console.log(`Found ${totalCount.toLocaleString()} ${collectionName} entries`);

  if (totalCount === 0) {
    console.log(`✅ No entries to delete. ${collectionName} collection is already empty.`);
    return { deleted: 0, total: 0 };
  }

  let deletedCount = 0;
  let errorCount = 0;
  let batchCount = 0;
  const BATCH_SIZE = 100;

  try {
    while (true) {
      // Fetch a batch of entries
      const response = await client.get(`/api/${collectionName}`, {
        params: {
          pagination: {
            pageSize: BATCH_SIZE,
            page: 1  // Always get page 1 since we're deleting
          }
        }
      });

      const entries = response.data.data;
      if (!entries || entries.length === 0) {
        break; // No more entries
      }

      // Delete each entry in the batch
      for (const entry of entries) {
        try {
          await client.delete(`/api/${collectionName}/${entry.id}`);
          deletedCount++;

          // Log progress every 1000 deletions
          if (deletedCount % 1000 === 0) {
            const percentage = ((deletedCount / totalCount) * 100).toFixed(1);
            console.log(`  Progress: ${deletedCount.toLocaleString()}/${totalCount.toLocaleString()} (${percentage}%)`);
          }
        } catch (deleteError) {
          errorCount++;
          if (errorCount <= 5) {
            console.error(`  Error deleting entry ${entry.id}:`, deleteError.response?.status || deleteError.message);
          }
        }
      }

      batchCount++;

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`✅ ${collectionName}: Deleted ${deletedCount.toLocaleString()} entries`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} errors occurred during deletion`);
    }

    // Verify cleanup
    const remainingCount = await getCollectionCount(collectionName);
    if (remainingCount > 0) {
      console.log(`⚠️  Warning: ${remainingCount} entries remaining in ${collectionName}`);
    }

    return { deleted: deletedCount, total: totalCount, errors: errorCount };

  } catch (error) {
    console.error(`\n❌ ${collectionName} cleanup failed:`, error.message);
    console.log(`Deleted ${deletedCount.toLocaleString()} entries before error.`);
    return { deleted: deletedCount, total: totalCount, errors: errorCount };
  }
}

async function cleanupAllData() {
  console.log('\n🧹 Comprehensive Strapi Data Cleanup (Auto-confirmed)\n');
  console.log('═'.repeat(60));
  console.log('This will delete ALL data from:');
  console.log('  • Discounts');
  console.log('  • Inventories');
  console.log('  • Product-discounts');
  console.log('═'.repeat(60));

  // Get initial counts
  console.log('\nChecking current data...');
  const discountCount = await getCollectionCount('discounts');
  const inventoryCount = await getCollectionCount('inventories');
  const productDiscountCount = await getCollectionCount('product-discounts');

  console.log('\nCurrent data:');
  console.log(`  Discounts: ${discountCount.toLocaleString()}`);
  console.log(`  Inventories: ${inventoryCount.toLocaleString()}`);
  console.log(`  Product-discounts: ${productDiscountCount.toLocaleString()}`);

  const totalEntries = discountCount + inventoryCount + productDiscountCount;
  console.log(`\n  Total entries to delete: ${totalEntries.toLocaleString()}`);

  if (totalEntries === 0) {
    console.log('\n✅ All collections are already empty. Nothing to delete.');
    return;
  }

  console.log('\n🗑️  Starting comprehensive cleanup...');

  const startTime = Date.now();
  const results = {};

  // Delete in order: product-discounts first (they reference discounts),
  // then discounts, then inventory
  results.productDiscounts = await deleteCollection('product-discounts');
  results.discounts = await deleteCollection('discounts');
  results.inventories = await deleteCollection('inventories');

  const endTime = Date.now();
  const durationSeconds = ((endTime - startTime) / 1000).toFixed(1);

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Cleanup Complete!');
  console.log('═'.repeat(60));
  console.log('\nResults:');
  console.log(`  Product-discounts: ${results.productDiscounts.deleted.toLocaleString()}/${results.productDiscounts.total.toLocaleString()} deleted`);
  console.log(`  Discounts: ${results.discounts.deleted.toLocaleString()}/${results.discounts.total.toLocaleString()} deleted`);
  console.log(`  Inventories: ${results.inventories.deleted.toLocaleString()}/${results.inventories.total.toLocaleString()} deleted`);
  console.log(`\n  Total deleted: ${(results.productDiscounts.deleted + results.discounts.deleted + results.inventories.deleted).toLocaleString()}`);
  console.log(`  Duration: ${durationSeconds}s`);
  console.log('═'.repeat(60));
  console.log('\n✓ All collections cleared - Ready for fresh data sync\n');
}

// Run the cleanup
cleanupAllData().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});

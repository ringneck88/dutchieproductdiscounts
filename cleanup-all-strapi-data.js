/**
 * Comprehensive Cleanup Script: Delete all inventory, products, and product-discounts
 *
 * This removes ALL data from:
 * - Inventories collection
 * - Products collection
 * - Product-discounts collection
 *
 * WARNING: This will delete all data from these collections!
 * The discount collection type structure will remain intact.
 */

const axios = require('axios');
const readline = require('readline');

const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';
const TOKEN = 'ed89dfa057610b43807f12b4442a2eabaca392c4ab26fe6c4f42eef9e9fb8e0ed5c6a6819c534b56228dd9073536ccd0f6e1dd38fc259d2ed593255bba54996c769c1a7cb81e4b6007265e2e76eac716b3ca5ed25732ee1f6629289f069f405e9e84d2bcf6c606284e710f8d755c9650e97b9a291fb3f5ad39035fd1019f4008';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function confirmDeletion() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\n⚠️  WARNING: This will delete ALL inventory, products, and product-discount entries!\n\nType "DELETE ALL" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'DELETE ALL');
    });
  });
}

async function getCollectionCount(collection) {
  try {
    const response = await client.get(`/api/${collection}`, {
      params: { pagination: { pageSize: 1 } }
    });
    return response.data.meta?.pagination?.total || 0;
  } catch (error) {
    console.error(`Error getting ${collection} count:`, error.message);
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

          // Log progress every 100 deletions
          if (deletedCount % 100 === 0) {
            const percentage = ((deletedCount / totalCount) * 100).toFixed(1);
            console.log(`  Progress: ${deletedCount.toLocaleString()}/${totalCount.toLocaleString()} (${percentage}%)`);
          }
        } catch (deleteError) {
          console.error(`  Error deleting entry ${entry.id}:`, deleteError.response?.status || deleteError.message);
        }
      }

      batchCount++;

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ ${collectionName}: Deleted ${deletedCount.toLocaleString()} entries`);

    // Verify cleanup
    const remainingCount = await getCollectionCount(collectionName);
    if (remainingCount > 0) {
      console.log(`⚠️  Warning: ${remainingCount} entries remaining in ${collectionName}`);
    }

    return { deleted: deletedCount, total: totalCount };

  } catch (error) {
    console.error(`\n❌ ${collectionName} cleanup failed:`, error.message);
    console.log(`Deleted ${deletedCount.toLocaleString()} entries before error.`);
    return { deleted: deletedCount, total: totalCount };
  }
}

async function cleanupAllData() {
  console.log('\n🧹 Comprehensive Strapi Data Cleanup\n');
  console.log('═'.repeat(60));
  console.log('This will delete ALL data from:');
  console.log('  • Inventories');
  console.log('  • Products');
  console.log('  • Product-discounts');
  console.log('\n✓ Discount collection type will remain intact (structure preserved)');
  console.log('═'.repeat(60));

  // Get initial counts
  const inventoryCount = await getCollectionCount('inventories');
  const productCount = await getCollectionCount('products');
  const productDiscountCount = await getCollectionCount('product-discounts');

  console.log('\nCurrent data:');
  console.log(`  Inventories: ${inventoryCount.toLocaleString()}`);
  console.log(`  Products: ${productCount.toLocaleString()}`);
  console.log(`  Product-discounts: ${productDiscountCount.toLocaleString()}`);

  const totalEntries = inventoryCount + productCount + productDiscountCount;
  console.log(`\n  Total entries to delete: ${totalEntries.toLocaleString()}`);

  // Confirm deletion
  const confirmed = await confirmDeletion();
  if (!confirmed) {
    console.log('\n❌ Deletion cancelled.');
    return;
  }

  console.log('\n🗑️  Starting comprehensive cleanup...');

  const startTime = Date.now();
  const results = {};

  // Delete in order: product-discounts first (they reference products),
  // then products, then inventory
  results.productDiscounts = await deleteCollection('product-discounts');
  results.products = await deleteCollection('products');
  results.inventories = await deleteCollection('inventories');

  const endTime = Date.now();
  const durationSeconds = ((endTime - startTime) / 1000).toFixed(1);

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Cleanup Complete!');
  console.log('═'.repeat(60));
  console.log('\nResults:');
  console.log(`  Inventories: ${results.inventories.deleted.toLocaleString()}/${results.inventories.total.toLocaleString()} deleted`);
  console.log(`  Products: ${results.products.deleted.toLocaleString()}/${results.products.total.toLocaleString()} deleted`);
  console.log(`  Product-discounts: ${results.productDiscounts.deleted.toLocaleString()}/${results.productDiscounts.total.toLocaleString()} deleted`);
  console.log(`\n  Total deleted: ${(results.inventories.deleted + results.products.deleted + results.productDiscounts.deleted).toLocaleString()}`);
  console.log(`  Duration: ${durationSeconds}s`);
  console.log('═'.repeat(60));
  console.log('\n✓ Ready for fresh data sync');
  console.log('✓ Discount collection structure preserved\n');
}

// Run the cleanup
cleanupAllData();

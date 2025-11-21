/**
 * Cleanup Script: Delete all product-discount entries
 *
 * This removes the 310K+ product-discount pairs from Strapi.
 * Run this AFTER confirming the new sync is working without product-discounts.
 *
 * WARNING: This will delete all data in the product-discounts collection!
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
    rl.question('\n⚠️  WARNING: This will delete ALL product-discount entries!\n\nType "DELETE" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'DELETE');
    });
  });
}

async function getProductDiscountCount() {
  try {
    const response = await client.get('/api/product-discounts', {
      params: { pagination: { pageSize: 1 } }
    });
    return response.data.meta?.pagination?.total || 0;
  } catch (error) {
    console.error('Error getting count:', error.message);
    return 0;
  }
}

async function deleteAllProductDiscounts() {
  console.log('🧹 Product-Discount Cleanup Script\n');
  console.log('═'.repeat(50));

  // Check current count
  console.log('Checking current product-discount count...');
  const totalCount = await getProductDiscountCount();
  console.log(`Found ${totalCount.toLocaleString()} product-discount entries`);

  if (totalCount === 0) {
    console.log('\n✅ No entries to delete. Collection is already empty.');
    return;
  }

  // Confirm deletion
  const confirmed = await confirmDeletion();
  if (!confirmed) {
    console.log('\n❌ Deletion cancelled.');
    return;
  }

  console.log('\n🗑️  Starting deletion process...\n');

  let deletedCount = 0;
  let batchCount = 0;
  const BATCH_SIZE = 100;

  try {
    while (true) {
      // Fetch a batch of entries
      const response = await client.get('/api/product-discounts', {
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
          await client.delete(`/api/product-discounts/${entry.id}`);
          deletedCount++;

          // Log progress every 100 deletions
          if (deletedCount % 100 === 0) {
            const percentage = ((deletedCount / totalCount) * 100).toFixed(1);
            console.log(`  Progress: ${deletedCount.toLocaleString()}/${totalCount.toLocaleString()} (${percentage}%) deleted`);
          }
        } catch (deleteError) {
          console.error(`  Error deleting entry ${entry.id}:`, deleteError.response?.status || deleteError.message);
        }
      }

      batchCount++;

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`✅ Cleanup complete!`);
    console.log(`   Deleted: ${deletedCount.toLocaleString()} entries`);
    console.log(`   Batches: ${batchCount}`);
    console.log('═'.repeat(50) + '\n');

    // Verify cleanup
    const remainingCount = await getProductDiscountCount();
    if (remainingCount === 0) {
      console.log('✅ Verification: Collection is now empty');
    } else {
      console.log(`⚠️  Verification: ${remainingCount} entries remaining`);
      console.log('   You may need to run this script again.');
    }

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.log(`\nDeleted ${deletedCount.toLocaleString()} entries before error.`);
  }
}

// Run the cleanup
deleteAllProductDiscounts();

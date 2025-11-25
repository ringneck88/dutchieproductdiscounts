/**
 * Test discount sync directly - bypasses Strapi store fetch
 */

import * as dotenv from 'dotenv';
dotenv.config();

import databaseService from './services/database.service';

async function testDiscountSync() {
  console.log('Testing Discount Sync...\n');

  // Mock store info
  const storeInfo = {
    dutchieStoreID: 'test-store-123',
    storeName: 'Test Store',
  };

  // Mock discount data (similar to what Dutchie returns)
  const mockDiscounts = [
    {
      discountId: 'test-discount-1',
      discountName: 'Test 10% Off',
      discountCode: 'TEST10',
      discountAmount: 10,
      discountType: 'Percent',
      discountMethod: 'Automatic',
      applicationMethod: 'ItemLevel',
      isActive: true,
      isAvailableOnline: true,
      isDeleted: false,
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    },
    {
      discountId: 'test-discount-2',
      discountName: 'Test $5 Off',
      discountCode: 'FIVE',
      discountAmount: 5,
      discountType: 'Dollar',
      discountMethod: 'Code',
      applicationMethod: 'OrderLevel',
      isActive: true,
      isAvailableOnline: true,
      isDeleted: false,
    },
  ];

  try {
    // Connect to database
    console.log('Connecting to database...');
    await databaseService.connect();
    console.log('✅ Connected!\n');

    // Run the bulk upsert
    console.log('Running bulkUpsertDiscounts...\n');
    const result = await databaseService.bulkUpsertDiscounts(mockDiscounts, storeInfo);

    console.log('\n📊 Results:');
    console.log(`  Created: ${result.created}`);
    console.log(`  Deleted: ${result.deleted}`);
    console.log(`  Errors: ${result.errors}`);

    // Verify by querying
    const columns = await databaseService.getTableColumns('discounts');
    console.log(`\n✅ Test complete! Discount table has ${columns.length} columns.`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await databaseService.disconnect();
  }
}

testDiscountSync();

/**
 * Test inventory sync with mock data
 */

import * as dotenv from 'dotenv';
dotenv.config();

import databaseService from './services/database.service';

async function test() {
  console.log('Testing Inventory Sync...\n');

  const storeInfo = {
    dutchieStoreID: 'TEST-STORE-ABC123',
    storeName: 'Test Store',
  };

  console.log('Store info being passed:');
  console.log('  dutchieStoreID:', storeInfo.dutchieStoreID);
  console.log('  storeName:', storeInfo.storeName);
  console.log('');

  const mockInventory = [
    {
      inventoryId: 'test-inv-001',
      productName: 'Test Product 1',
      quantityAvailable: 10,
      category: 'Flower',
    },
    {
      inventoryId: 'test-inv-002',
      productName: 'Test Product 2',
      quantityAvailable: 20,
      category: 'Edibles',
    },
  ];

  try {
    await databaseService.connect();

    const result = await databaseService.bulkUpsertInventory(mockInventory, storeInfo);

    console.log('\nResults:', result);

    // Verify the data
    const columns = await databaseService.getTableColumns('inventories');
    console.log('\nVerifying inserted data...');

    // Query the test records
    const pool = (databaseService as any).pool;
    const checkResult = await pool.query(`
      SELECT inventory_id, product_name, dutchie_store_id
      FROM inventories
      WHERE inventory_id LIKE 'test-inv-%'
    `);

    console.log('\nInserted records:');
    checkResult.rows.forEach((r: any) => {
      console.log(`  ${r.inventory_id}: ${r.product_name}`);
      console.log(`    dutchie_store_id: ${r.dutchie_store_id || '(NULL)'}`);
    });

    // Cleanup
    await pool.query("DELETE FROM inventories WHERE inventory_id LIKE 'test-inv-%'");
    console.log('\nCleaned up test records');

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await databaseService.disconnect();
  }
}

test();

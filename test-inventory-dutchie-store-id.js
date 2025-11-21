const axios = require('axios');

const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';

async function testInventoryStoreID() {
  console.log('🔍 Testing Inventory DutchieStoreID Population...\n');

  try {
    // Fetch some inventory items
    console.log('Fetching inventory items...');
    const response = await axios.get(`${BASE_URL}/api/inventories`, {
      params: {
        pagination: { pageSize: 10 }
      }
    });

    const items = response.data.data;

    if (items.length === 0) {
      console.log('❌ No inventory items found');
      return;
    }

    console.log(`Found ${items.length} inventory items to check\n`);

    let itemsWithStoreID = 0;
    let itemsWithoutStoreID = 0;

    console.log('Sample inventory items:\n');

    for (let i = 0; i < Math.min(5, items.length); i++) {
      const item = items[i].attributes || items[i];

      console.log(`${i + 1}. ${item.productName || 'Unknown Product'}`);
      console.log(`   Inventory ID: ${item.inventoryId}`);
      console.log(`   Store Name: ${item.storeName || 'NOT SET'}`);
      console.log(`   Strapi Store ID: ${item.storeId || 'NOT SET'}`);
      console.log(`   DutchieStoreID: ${item.DutchieStoreID || 'NOT SET'}`);

      if (item.DutchieStoreID) {
        itemsWithStoreID++;
        console.log(`   ✅ HAS DutchieStoreID`);
      } else {
        itemsWithoutStoreID++;
        console.log(`   ❌ MISSING DutchieStoreID`);
      }
      console.log('');
    }

    // Check all items
    for (const item of items) {
      const inventory = item.attributes || item;
      if (inventory.DutchieStoreID) {
        itemsWithStoreID++;
      } else {
        itemsWithoutStoreID++;
      }
    }

    console.log('═'.repeat(50));
    console.log('Summary:');
    console.log(`  Total checked: ${items.length}`);
    console.log(`  With DutchieStoreID: ${itemsWithStoreID}`);
    console.log(`  Without DutchieStoreID: ${itemsWithoutStoreID}`);

    if (itemsWithStoreID === items.length) {
      console.log('\n✅ ALL inventory items have DutchieStoreID!');
    } else if (itemsWithStoreID > 0) {
      console.log('\n⚠️  PARTIAL: Some items have DutchieStoreID, some don\'t');
      console.log('   This is normal if sync is in progress or items are old.');
    } else {
      console.log('\n❌ NO inventory items have DutchieStoreID');
      console.log('   Check if sync has completed with store associations.');
    }
    console.log('═'.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testInventoryStoreID();

const axios = require('axios');

const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';

async function testStoreAssociations() {
  console.log('🏪 Testing Store Associations...\n');

  try {
    // Test discounts
    console.log('1️⃣ Testing Discount Store Associations...');
    const discountsResponse = await axios.get(`${BASE_URL}/api/discounts`, {
      params: { pagination: { pageSize: 5 } }
    });

    if (discountsResponse.data.data.length > 0) {
      let foundStores = 0;

      for (const item of discountsResponse.data.data) {
        const discount = item.attributes || item;

        if (discount.stores && Array.isArray(discount.stores) && discount.stores.length > 0) {
          foundStores++;

          if (foundStores === 1) {
            console.log(`\n   ✅ Sample discount with store data:`);
            console.log(`      Name: "${discount.discountName}"`);
            console.log(`      ID: ${discount.discountId}`);
            console.log(`      Applies to ${discount.stores.length} store(s):`);

            discount.stores.forEach(store => {
              console.log(`         - ${store.storeName} (Strapi ID: ${store.storeId}, Dutchie ID: ${store.DutchieStoreID})`);
            });
          }
        }
      }

      if (foundStores > 0) {
        console.log(`\n   ✅ ${foundStores}/${discountsResponse.data.data.length} discounts have store associations`);
      } else {
        console.log(`\n   ⏳ No store data found yet - waiting for next sync`);
      }
    }

    // Test inventory
    console.log('\n2️⃣ Testing Inventory Store Associations...');
    const inventoryResponse = await axios.get(`${BASE_URL}/api/inventories`, {
      params: { pagination: { pageSize: 5 } }
    });

    if (inventoryResponse.data.data.length > 0) {
      let foundStores = 0;

      for (const item of inventoryResponse.data.data) {
        const inventory = item.attributes || item;

        if (inventory.storeId && inventory.storeName && inventory.DutchieStoreID) {
          foundStores++;

          if (foundStores === 1) {
            console.log(`\n   ✅ Sample inventory with store data:`);
            console.log(`      Product: "${inventory.productName}"`);
            console.log(`      SKU: ${inventory.sku}`);
            console.log(`      Store: ${inventory.storeName}`);
            console.log(`      Strapi Store ID: ${inventory.storeId}`);
            console.log(`      Dutchie Store ID: ${inventory.DutchieStoreID}`);
          }
        }
      }

      if (foundStores > 0) {
        console.log(`\n   ✅ ${foundStores}/${inventoryResponse.data.data.length} inventory items have store associations`);
      } else {
        console.log(`\n   ⏳ No store data found yet - waiting for next sync`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Test complete! Run again in a few minutes if data not yet populated.');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testStoreAssociations();

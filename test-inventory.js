const axios = require('axios');

const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';

async function testInventory() {
  console.log('📦 Testing Inventory Collection...\n');

  try {
    // Test inventory WITHOUT any authorization header (public access)
    console.log('Testing /api/inventories (no auth)...');
    const inventoryResponse = await axios.get(`${BASE_URL}/api/inventories`, {
      params: { pagination: { pageSize: 5 } }
    });

    const inventoryTotal = inventoryResponse.data.meta?.pagination?.total || inventoryResponse.data.data.length;
    console.log(`✅ Inventory accessible! Total: ${inventoryTotal}`);

    if (inventoryResponse.data.data.length > 0) {
      const sample = inventoryResponse.data.data[0];
      const item = sample.attributes || sample;
      console.log(`\n📦 Sample inventory item:`);
      console.log(`   Product: ${item.productName}`);
      console.log(`   SKU: ${item.sku}`);
      console.log(`   Inventory ID: ${item.inventoryId}`);
      console.log(`   Quantity Available: ${item.quantityAvailable} ${item.quantityUnits || ''}`);
      console.log(`   Unit Price: $${item.unitPrice}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Brand: ${item.brandName}`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ INVENTORY COLLECTION IS WORKING!');
    console.log(`📊 Total Inventory Items: ${inventoryTotal}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Also check other collections
    console.log('\n📊 Summary of All Collections:');

    const discountsResponse = await axios.get(`${BASE_URL}/api/discounts`, {
      params: { pagination: { pageSize: 1 } }
    });
    const discountTotal = discountsResponse.data.meta?.pagination?.total || 0;
    console.log(`   Discounts: ${discountTotal}`);

    const pdResponse = await axios.get(`${BASE_URL}/api/product-discounts`, {
      params: { pagination: { pageSize: 1 } }
    });
    const pdTotal = pdResponse.data.meta?.pagination?.total || 0;
    console.log(`   Product-Discounts: ${pdTotal}`);

    console.log(`   Inventory: ${inventoryTotal}`);
    console.log('');

  } catch (error) {
    const status = error.response?.status;

    if (status === 403 || status === 401) {
      console.log(`❌ PUBLIC ACCESS NOT ENABLED (${status})`);
      console.log('\n💡 Railway is still deploying the inventory collection.');
      console.log('   Wait 2-3 minutes, then run this test again.\n');
    } else if (status === 404) {
      console.log('❌ INVENTORY COLLECTION NOT FOUND (404)');
      console.log('\n💡 Railway is still deploying. The collection hasn\'t been created yet.');
      console.log('   Wait 2-3 minutes for Railway to rebuild, then test again.\n');
    } else {
      console.log('❌ Error:', error.response?.data || error.message);
    }
  }
}

testInventory();

const axios = require('axios');

const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';

async function testPublicAccess() {
  console.log('🔓 Testing ALL Collections (no auth)...\n');

  try {
    // Test discounts
    console.log('1️⃣ Testing /api/discounts...');
    const discountsResponse = await axios.get(`${BASE_URL}/api/discounts`, {
      params: { pagination: { pageSize: 3 } }
    });

    const discountTotal = discountsResponse.data.meta?.pagination?.total || discountsResponse.data.data.length;
    console.log(`   ✅ Discounts accessible! Total: ${discountTotal}`);

    if (discountsResponse.data.data.length > 0) {
      const sample = discountsResponse.data.data[0];
      const discount = sample.attributes || sample;
      console.log(`   📦 Sample: "${discount.discountName}" (ID: ${discount.discountId})`);
    }

    // Test product-discounts
    console.log('\n2️⃣ Testing /api/product-discounts...');
    const pdResponse = await axios.get(`${BASE_URL}/api/product-discounts`, {
      params: { pagination: { pageSize: 3 } }
    });

    const pdTotal = pdResponse.data.meta?.pagination?.total || pdResponse.data.data.length;
    console.log(`   ✅ Product-discounts accessible! Total: ${pdTotal}`);

    if (pdResponse.data.data.length > 0) {
      const sample = pdResponse.data.data[0];
      const pd = sample.attributes || sample;
      console.log(`   📦 Sample: "${pd.productName}" - "${pd.discountName}"`);
    }

    // Test inventory
    console.log('\n3️⃣ Testing /api/inventories...');
    const inventoryResponse = await axios.get(`${BASE_URL}/api/inventories`, {
      params: { pagination: { pageSize: 3 } }
    });

    const inventoryTotal = inventoryResponse.data.meta?.pagination?.total || inventoryResponse.data.data.length;
    console.log(`   ✅ Inventory accessible! Total: ${inventoryTotal}`);

    if (inventoryResponse.data.data.length > 0) {
      const sample = inventoryResponse.data.data[0];
      const item = sample.attributes || sample;
      console.log(`   📦 Sample: "${item.productName}" (SKU: ${item.sku})`);
      console.log(`       Qty: ${item.quantityAvailable} ${item.quantityUnits || ''} | Price: $${item.unitPrice}`);
    } else {
      console.log(`   ⏳ Inventory sync hasn't run yet (0 items)`);
      console.log(`       This is normal - Railway sync service is still deploying`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ PUBLIC ACCESS IS ENABLED FOR ALL COLLECTIONS!');
    console.log('✅ Your Deals page can access all data without auth');
    console.log('');
    console.log('📊 Current Data Counts:');
    console.log(`   - Discounts: ${discountTotal.toLocaleString()}`);
    console.log(`   - Product-Discounts: ${pdTotal.toLocaleString()}`);
    console.log(`   - Inventory: ${inventoryTotal.toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    const status = error.response?.status;

    if (status === 403 || status === 401) {
      console.log(`❌ PUBLIC ACCESS NOT ENABLED (${status})`);
      console.log('\n💡 Railway is still deploying.');
      console.log('   Wait 2-3 minutes, then run this test again.\n');
    } else if (status === 404) {
      console.log(`❌ COLLECTION NOT FOUND (404)`);
      console.log('\n💡 Railway is still building the collection.');
      console.log('   Wait 2-3 minutes, then test again.\n');
    } else {
      console.log('❌ Error:', error.response?.data || error.message);
    }
  }
}

testPublicAccess();

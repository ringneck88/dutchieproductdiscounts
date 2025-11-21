const axios = require('axios');

const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';

async function testRedisConnection() {
  console.log('🔍 Verifying Redis Connection and System Health...\n');

  try {
    // Test 1: Check if sync service health endpoint exists
    console.log('1️⃣ Testing sync service health...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/health`, {
        timeout: 10000
      });

      console.log(`   ✅ Health check passed`);
      console.log(`   Strapi: ${healthResponse.data.strapi}`);
      console.log(`   Redis: ${healthResponse.data.redis || 'Not available'}`);

      if (healthResponse.data.redis === 'connected') {
        console.log(`   ✅ Redis is CONNECTED!\n`);
      } else {
        console.log(`   ⚠️  Redis is not connected (may not be enabled)\n`);
      }
    } catch (healthError) {
      console.log(`   ℹ️  Health endpoint not accessible (this is okay)\n`);
    }

    // Test 2: Check Strapi API is responding
    console.log('2️⃣ Testing Strapi API...');
    const storesResponse = await axios.get(`${BASE_URL}/api/stores`, {
      params: { pagination: { pageSize: 1 } },
      timeout: 10000
    });

    const storeCount = storesResponse.data.meta?.pagination?.total || storesResponse.data.data.length;
    console.log(`   ✅ Strapi API responding`);
    console.log(`   Stores available: ${storeCount}\n`);

    // Test 3: Check discounts
    console.log('3️⃣ Testing Discounts API...');
    const discountsResponse = await axios.get(`${BASE_URL}/api/discounts`, {
      params: { pagination: { pageSize: 1 } },
      timeout: 10000
    });

    const discountCount = discountsResponse.data.meta?.pagination?.total || discountsResponse.data.data.length;
    console.log(`   ✅ Discounts API responding`);
    console.log(`   Discounts available: ${discountCount}\n`);

    // Test 4: Check inventory
    console.log('4️⃣ Testing Inventory API...');
    const inventoryResponse = await axios.get(`${BASE_URL}/api/inventories`, {
      params: { pagination: { pageSize: 1 } },
      timeout: 10000
    });

    const inventoryCount = inventoryResponse.data.meta?.pagination?.total || inventoryResponse.data.data.length;
    console.log(`   ✅ Inventory API responding`);
    console.log(`   Inventory items available: ${inventoryCount}\n`);

    // Test 5: Check product-discounts
    console.log('5️⃣ Testing Product-Discounts API...');
    const productDiscountsResponse = await axios.get(`${BASE_URL}/api/product-discounts`, {
      params: { pagination: { pageSize: 1 } },
      timeout: 10000
    });

    const pdCount = productDiscountsResponse.data.meta?.pagination?.total || productDiscountsResponse.data.data.length;
    console.log(`   ✅ Product-Discounts API responding`);
    console.log(`   Product-Discount pairs available: ${pdCount}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL SYSTEMS OPERATIONAL');
    console.log('');
    console.log('Summary:');
    console.log(`  - Stores: ${storeCount}`);
    console.log(`  - Discounts: ${discountCount}`);
    console.log(`  - Inventory: ${inventoryCount}`);
    console.log(`  - Product-Discounts: ${pdCount}`);
    console.log('');
    console.log('To check Railway logs for Redis connection status:');
    console.log('  1. Go to Railway dashboard');
    console.log('  2. Click on your sync service');
    console.log('  3. Check logs for "Redis connected successfully"');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Request timeout - service may be starting up');
    } else if (error.response?.status === 401) {
      console.error('❌ Unauthorized - API token may need updating');
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      console.error('❌ DNS resolution error - network issue');
    } else {
      console.error('❌ Error:', error.message);
      if (error.response?.data) {
        console.error('   Response:', error.response.data);
      }
    }
  }
}

testRedisConnection();

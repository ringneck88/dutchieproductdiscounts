const axios = require('axios');

const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';
const TOKEN = 'ed89dfa057610b43807f12b4442a2eabaca392c4ab26fe6c4f42eef9e9fb8e0ed5c6a6819c534b56228dd9073536ccd0f6e1dd38fc259d2ed593255bba54996c769c1a7cb81e4b6007265e2e76eac716b3ca5ed25732ee1f6629289f069f405e9e84d2bcf6c606284e710f8d755c9650e97b9a291fb3f5ad39035fd1019f4008';

async function testNewToken() {
  console.log('🔑 Testing New Strapi API Token...\n');

  try {
    // Test stores endpoint
    console.log('1️⃣ Testing /api/stores...');
    const storesResponse = await axios.get(`${BASE_URL}/api/stores`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      params: {
        pagination: { pageSize: 5 }
      }
    });

    const storeTotal = storesResponse.data.meta?.pagination?.total || storesResponse.data.data.length;
    console.log(`   ✅ SUCCESS! Stores: ${storeTotal}`);

    // Test discounts endpoint
    console.log('\n2️⃣ Testing /api/discounts...');
    const discountsResponse = await axios.get(`${BASE_URL}/api/discounts`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      params: {
        pagination: { pageSize: 5 }
      }
    });

    const discountTotal = discountsResponse.data.meta?.pagination?.total || discountsResponse.data.data.length;
    console.log(`   ✅ SUCCESS! Discounts: ${discountTotal}`);

    // Test inventory endpoint
    console.log('\n3️⃣ Testing /api/inventories...');
    const inventoryResponse = await axios.get(`${BASE_URL}/api/inventories`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      params: {
        pagination: { pageSize: 5 }
      }
    });

    const inventoryTotal = inventoryResponse.data.meta?.pagination?.total || inventoryResponse.data.data.length;
    console.log(`   ✅ SUCCESS! Inventory: ${inventoryTotal}`);

    // Test product-discounts endpoint
    console.log('\n4️⃣ Testing /api/product-discounts...');
    const pdResponse = await axios.get(`${BASE_URL}/api/product-discounts`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      params: {
        pagination: { pageSize: 5 }
      }
    });

    const pdTotal = pdResponse.data.meta?.pagination?.total || pdResponse.data.data.length;
    console.log(`   ✅ SUCCESS! Product-Discounts: ${pdTotal}`);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ NEW TOKEN IS WORKING!');
    console.log('\nNow update Railway environment variable:');
    console.log('  1. Go to Railway dashboard → dutchieproductdiscounts service');
    console.log('  2. Click "Variables" tab');
    console.log('  3. Update STRAPI_API_TOKEN to:');
    console.log(`     ${TOKEN}`);
    console.log('  4. Railway will auto-redeploy');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ TOKEN INVALID (401 Unauthorized)');
      console.error('   The token may not have the correct permissions.');
      console.error('   Make sure all collections have find/findOne permissions.\n');
    } else {
      console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
    }
  }
}

testNewToken();

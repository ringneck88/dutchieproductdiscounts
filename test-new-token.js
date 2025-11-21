const axios = require('axios');

const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';
const TOKEN = '810bc109f4dadb261d8e2fa22d65f8acc68b4a513a21603037d3dc447c9703a86b31361eac19a80b1c90384e949c08e9269428f6e859693b127ed0ad01b18bae95c7f9e1325dd937cd032dc4e97119c88169a6613b05c7fad3d26e14387b393a0deefde5612cc2276282dd8d5c21463948975f8df834029ff0c1981e3e9fadf8';

async function testToken() {
  console.log('🔑 Testing New API Token...\n');

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

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ NEW TOKEN IS WORKING!');
    console.log('Now update Railway environment variable with this token.');
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

testToken();

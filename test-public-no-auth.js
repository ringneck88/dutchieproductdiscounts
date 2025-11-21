const axios = require('axios');

const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';

async function testPublicAccess() {
  console.log('🔓 Testing Public Access (No Authentication)...\n');

  try {
    // Test discounts WITHOUT bearer token
    console.log('1️⃣ Testing /api/discounts (no auth)...');
    const discountsResponse = await axios.get(`${BASE_URL}/api/discounts`, {
      params: {
        pagination: { pageSize: 3 }
      }
    });

    const discountTotal = discountsResponse.data.meta?.pagination?.total || discountsResponse.data.data.length;
    console.log(`   ✅ SUCCESS! Discounts accessible without auth`);
    console.log(`   📊 Total: ${discountTotal} discounts`);

    if (discountsResponse.data.data.length > 0) {
      const sample = discountsResponse.data.data[0];
      const discount = sample.attributes || sample;
      console.log(`   📦 Sample: "${discount.discountName}" (ID: ${discount.discountId})`);
    }

    // Test product-discounts WITHOUT bearer token
    console.log('\n2️⃣ Testing /api/product-discounts (no auth)...');
    const pdResponse = await axios.get(`${BASE_URL}/api/product-discounts`, {
      params: {
        pagination: { pageSize: 3 }
      }
    });

    const pdTotal = pdResponse.data.meta?.pagination?.total || pdResponse.data.data.length;
    console.log(`   ✅ SUCCESS! Product-discounts accessible without auth`);
    console.log(`   📊 Total: ${pdTotal} product-discounts`);

    if (pdResponse.data.data.length > 0) {
      const sample = pdResponse.data.data[0];
      const pd = sample.attributes || sample;
      console.log(`   📦 Sample: "${pd.productName}" - "${pd.discountName}"`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ PUBLIC ACCESS WORKING!');
    console.log('Your frontend/Deals page can now fetch discount data');
    console.log('without needing authentication tokens.');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('\n❌ PUBLIC ACCESS NOT YET ENABLED');
      console.error('Status:', error.response.status);
      console.error('This means Railway hasn'\''t finished deploying the public access changes yet.');
      console.error('\n💡 Wait 2-3 minutes for Railway to rebuild, then run this test again.\n');
    } else {
      console.error('\n❌ Error:', error.response?.data || error.message);
    }
  }
}

testPublicAccess();

const axios = require('axios');

async function testPublicAccess() {
  console.log('🔍 Testing PUBLIC access (no auth)...\n');

  try {
    // Test WITHOUT any authorization header
    const response = await axios.get(
      'https://mintdealsbackend-production.up.railway.app/api/product-discounts',
      {
        params: { pagination: { limit: 1 } }
      }
    );

    console.log('✅ PUBLIC ACCESS IS ENABLED!');
    console.log('✅ Your Deals page can access this data without authentication');
    console.log(`📊 Found ${response.data.data.length} records\n`);

  } catch (error) {
    const status = error.response?.status;

    if (status === 403) {
      console.log('❌ PUBLIC ACCESS IS DISABLED (403 Forbidden)');
      console.log('\n📋 TO FIX:');
      console.log('1. Go to: https://mintdealsbackend-production.up.railway.app/admin');
      console.log('2. Settings → Roles → Public');
      console.log('3. Enable permissions for PRODUCT-DISCOUNT:');
      console.log('   ✅ find');
      console.log('   ✅ findOne');
      console.log('4. Save');
      console.log('\n⚠️  Your Deals page CANNOT access the data until you enable public access!\n');
    } else if (status === 401) {
      console.log('❌ PUBLIC ACCESS IS DISABLED (401 Unauthorized)');
      console.log('\nSame fix as above - enable Public role permissions.\n');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testPublicAccess();

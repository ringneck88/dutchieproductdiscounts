const axios = require('axios');

const TOKEN = '0e7babce40605189bde8a0d586dacafd616fbbdbde0a364dabb141229f34bae0d852cdba40a5708dfe7a54c5d4f67b0f0b83a8ddef00d28e4526670e22a025eab8edd9b0f622643f04247ef8e0081553b58e1c77cfd4d2e0055ce5c8fc18b6f7011fbded5c71b41fb66c99f28fe1708da7e49a708c8253eb6e8586be9c683ff6';
const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';

async function checkStatus() {
  console.log('🔍 Detailed Status Check...\n');

  try {
    // Check discounts with more detail
    const discountsResponse = await axios.get(`${BASE_URL}/api/discounts`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      params: {
        pagination: { pageSize: 5 }
      }
    });

    const total = discountsResponse.data.meta?.pagination?.total || discountsResponse.data.data.length;
    console.log(`📊 Discounts Collection: ${total} total records`);

    if (total === 0) {
      console.log('\n⚠️  No discounts in Strapi yet. Possible reasons:');
      console.log('   1. Railway sync service is still deploying');
      console.log('   2. Sync service hasn\'t run its first cycle yet (runs every 15 min)');
      console.log('   3. All discounts were filtered out (inactive/deleted/expired)');
      console.log('   4. Sync is encountering errors');
      console.log('\n💡 What to check:');
      console.log('   - Go to Railway → Your sync service → Logs tab');
      console.log('   - Look for "Starting discount sync" or errors');
      console.log('   - Check if DUTCHIE_PRODUCT_LOOKBACK_HOURS is set to 2160');
    } else {
      console.log(`\n✅ Discounts are syncing! Found ${total} active discounts`);

      if (discountsResponse.data.data.length > 0) {
        const sample = discountsResponse.data.data[0];
        const discount = sample.attributes || sample;
        console.log('\n📦 Sample discount:');
        console.log(`   Name: ${discount.discountName}`);
        console.log(`   ID: ${discount.discountId}`);
        console.log(`   Active: ${discount.isActive}`);
        console.log(`   Valid Until: ${discount.validUntil}`);
      }
    }

    // Check product-discounts count
    const pdResponse = await axios.get(`${BASE_URL}/api/product-discounts`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      params: {
        pagination: { pageSize: 1 }
      }
    });

    const pdTotal = pdResponse.data.meta?.pagination?.total || pdResponse.data.data.length;
    console.log(`\n📊 Product-Discounts Collection: ${pdTotal} total records`);

    console.log('\n═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkStatus();

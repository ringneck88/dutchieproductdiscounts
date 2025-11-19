/**
 * Test if Dutchie /reporting/discounts endpoint is accessible
 */

const axios = require('axios');

// You'll need to add a test store's credentials here
const TEST_API_KEY = 'YOUR_DUTCHIE_API_KEY_HERE'; // Replace with a real API key from one of your stores

async function testDutchieDiscounts() {
  console.log('🔍 Testing Dutchie /reporting/discounts endpoint...\n');

  if (TEST_API_KEY === 'YOUR_DUTCHIE_API_KEY_HERE') {
    console.log('❌ Please edit this file and add a real Dutchie API key');
    console.log('   You can get one from Strapi → Stores collection → Pick any store');
    console.log('   Copy the dutchieApiKey value and paste it in this file\n');
    return;
  }

  const basicAuthString = Buffer.from(`${TEST_API_KEY}:`).toString('base64');

  try {
    const response = await axios.get(
      'https://api.pos.dutchie.com/reporting/discounts',
      {
        headers: {
          'Authorization': `Basic ${basicAuthString}`,
          'Accept': 'text/plain',
          'Content-Type': 'application/json',
        },
      }
    );

    const discounts = Array.isArray(response.data) ? response.data : [];
    console.log(`✅ Successfully fetched discounts from Dutchie!`);
    console.log(`   Found ${discounts.length} discounts`);

    if (discounts.length > 0) {
      const sample = discounts[0];
      console.log(`\n📦 Sample discount:`);
      console.log(`   ID: ${sample.discountId}`);
      console.log(`   Name: ${sample.discountName}`);
      console.log(`   Active: ${sample.isActive}`);
      console.log(`   Available Online: ${sample.isAvailableOnline}`);
    }

    console.log('\n✅ The /reporting/discounts endpoint is working!');
    console.log('   The sync service should be able to fetch discounts.\n');

  } catch (error) {
    console.log('❌ Failed to fetch discounts from Dutchie');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Message: ${error.response?.data || error.message}`);
    console.log('\n🔧 Possible issues:');
    console.log('   - API key is invalid');
    console.log('   - /reporting/discounts endpoint requires special permissions');
    console.log('   - Dutchie API is down');
    console.log('');
  }
}

testDutchieDiscounts();

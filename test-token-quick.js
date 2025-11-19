const axios = require('axios');

const TOKEN = 'e0c3f979591a13925592e9814f1d997151ae771c55fddb6417d0be3c0131ec901065091164586c3626d9e431afacd5bde0feb3b2b985803dbf62c45d06930b719ab1f2edf1de49880b48f3590bf6c7c6242fc9cb5b820555ff0ee8704fcc2ed71dac177765a509f3f430fe46fe3e3639e1fe579cdc1cffa30bf0bdb91f532c7d';
const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function test() {
  console.log('Testing Strapi API Token...\n');

  // Test 1: Stores
  try {
    const response = await client.get('/api/stores', {
      params: { pagination: { pageSize: 1 } }
    });
    console.log('✅ STORES endpoint - SUCCESS');
    console.log(`   Found ${response.data.data.length} store(s)\n`);
  } catch (error) {
    console.log('❌ STORES endpoint - FAILED');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Message: ${error.response?.data?.error?.message || error.message}\n`);
  }

  // Test 2: Product Discounts
  try {
    const response = await client.get('/api/product-discounts', {
      params: { pagination: { pageSize: 1 } }
    });
    console.log('✅ PRODUCT-DISCOUNTS endpoint - SUCCESS');
    console.log(`   Found ${response.data.data.length} product discount(s)\n`);
  } catch (error) {
    console.log('❌ PRODUCT-DISCOUNTS endpoint - FAILED');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Message: ${error.response?.data?.error?.message || error.message}\n`);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('If both tests show SUCCESS, your token is ready!');
  console.log('Next: Update STRAPI_API_TOKEN in Railway environment variables');
  console.log('═══════════════════════════════════════════════════════\n');
}

test().catch(console.error);

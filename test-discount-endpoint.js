const axios = require('axios');

const TOKEN = '0e7babce40605189bde8a0d586dacafd616fbbdbde0a364dabb141229f34bae0d852cdba40a5708dfe7a54c5d4f67b0f0b83a8ddef00d28e4526670e22a025eab8edd9b0f622643f04247ef8e0081553b58e1c77cfd4d2e0055ce5c8fc18b6f7011fbded5c71b41fb66c99f28fe1708da7e49a708c8253eb6e8586be9c683ff6';
const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';

async function testEndpoints() {
  console.log('🔍 Testing each endpoint individually...\n');

  const endpoints = [
    { name: 'Stores', url: '/api/stores' },
    { name: 'Product-Discounts', url: '/api/product-discounts' },
    { name: 'Discounts', url: '/api/discounts' },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        params: {
          pagination: { pageSize: 1 }
        }
      });

      const count = response.data.data?.length || 0;
      const total = response.data.meta?.pagination?.total || count;
      console.log(`  ✅ ${endpoint.name}: Working! (${total} total records)`);

      // Show sample data for discounts if any exist
      if (endpoint.name === 'Discounts' && count > 0) {
        console.log(`     Sample discount: ${response.data.data[0].discountName || response.data.data[0].attributes?.discountName}`);
      }
      console.log('');

    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;

      console.log(`  ❌ ${endpoint.name}: Failed!`);
      console.log(`     Status: ${status}`);
      console.log(`     Message: ${message}`);

      if (status === 401) {
        console.log(`     → Token lacks permissions for this collection`);
      } else if (status === 403) {
        console.log(`     → Token is valid but missing specific permissions`);
      } else if (status === 404) {
        console.log(`     → Collection doesn't exist in Strapi`);
      }
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('NEXT STEPS:');
  console.log('1. If Discounts shows 404: Wait for Railway to finish deploying');
  console.log('2. If Discounts shows 401/403: Update token permissions in Strapi');
  console.log('   Go to: Settings → API Tokens → Edit token → Add Discount permissions');
  console.log('═══════════════════════════════════════════════════════\n');
}

testEndpoints();

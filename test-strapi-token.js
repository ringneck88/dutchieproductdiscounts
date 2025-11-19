/**
 * Test script to verify Strapi API token permissions
 * This will help diagnose the 401 error
 */

const axios = require('axios');

const STRAPI_URL = process.env.STRAPI_API_URL || 'https://mintdealsbackend-production.up.railway.app';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';

async function testToken() {
  console.log('🔍 Testing Strapi API Token...\n');
  console.log(`Strapi URL: ${STRAPI_URL}`);
  console.log(`Token (first 20 chars): ${STRAPI_TOKEN.substring(0, 20)}...`);
  console.log(`Token length: ${STRAPI_TOKEN.length} characters\n`);

  if (!STRAPI_TOKEN) {
    console.error('❌ ERROR: STRAPI_API_TOKEN is not set!');
    console.log('\nPlease set it in your .env file or environment variables.');
    process.exit(1);
  }

  const client = axios.create({
    baseURL: STRAPI_URL,
    headers: {
      'Authorization': `Bearer ${STRAPI_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  // Test 1: Check if Strapi is reachable
  console.log('Test 1: Checking if Strapi is reachable...');
  try {
    const response = await axios.get(`${STRAPI_URL}/_health`);
    console.log('✅ Strapi is reachable\n');
  } catch (error) {
    console.log('⚠️  Health endpoint not available (this is okay)\n');
  }

  // Test 2: Try to fetch stores
  console.log('Test 2: Testing /api/stores endpoint...');
  try {
    const response = await client.get('/api/stores', {
      params: {
        pagination: { pageSize: 1 }
      }
    });
    console.log('✅ Successfully fetched stores!');
    console.log(`   Found ${response.data.data.length} store(s)`);
    if (response.data.data.length > 0) {
      const store = response.data.data[0];
      console.log(`   Example store: ${store.name || store.attributes?.name || 'N/A'}`);
    }
    console.log('');
  } catch (error) {
    console.log('❌ Failed to fetch stores');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Message: ${error.response?.data?.error?.message || error.message}`);
    console.log('\n🔧 Troubleshooting:');

    if (error.response?.status === 401) {
      console.log('   - Your token is invalid or expired');
      console.log('   - OR the token does not have "find" permission on "stores" collection');
    } else if (error.response?.status === 403) {
      console.log('   - Your token is valid but lacks permissions');
      console.log('   - Check that "stores" collection has "find" permission enabled');
    } else if (error.response?.status === 404) {
      console.log('   - The "stores" collection might not exist in your Strapi');
      console.log('   - OR the endpoint path is incorrect');
    }
    console.log('');
  }

  // Test 3: Try to fetch product-discounts
  console.log('Test 3: Testing /api/product-discounts endpoint...');
  try {
    const response = await client.get('/api/product-discounts', {
      params: {
        pagination: { pageSize: 1 }
      }
    });
    console.log('✅ Successfully fetched product-discounts!');
    console.log(`   Found ${response.data.data.length} product discount(s)\n`);
  } catch (error) {
    console.log('❌ Failed to fetch product-discounts');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Message: ${error.response?.data?.error?.message || error.message}`);
    console.log('\n🔧 Troubleshooting:');

    if (error.response?.status === 401) {
      console.log('   - Your token is invalid or expired');
      console.log('   - OR the token does not have "find" permission on "product-discounts" collection');
    } else if (error.response?.status === 403) {
      console.log('   - Your token is valid but lacks permissions');
      console.log('   - Check that "product-discounts" collection has "find" permission enabled');
    } else if (error.response?.status === 404) {
      console.log('   - The "product-discounts" collection might not exist in your Strapi');
      console.log('   - Run the Strapi setup instructions to create it');
    }
    console.log('');
  }

  // Test 4: Check token info endpoint (if available)
  console.log('Test 4: Checking token information...');
  try {
    const response = await client.get('/api/users/me');
    console.log('✅ Token is authenticated');
    console.log(`   User: ${response.data.username || response.data.email || 'API Token'}\n`);
  } catch (error) {
    console.log('ℹ️  Token info not available (this is normal for API tokens)\n');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('To fix the 401 error, follow these steps:\n');
  console.log('1. Log into Strapi admin: ' + STRAPI_URL + '/admin');
  console.log('2. Go to Settings → API Tokens');
  console.log('3. Create a new token with these permissions:');
  console.log('   ✓ stores: find, findOne');
  console.log('   ✓ product-discounts: find, findOne, create, update, delete');
  console.log('4. Copy the new token');
  console.log('5. Update STRAPI_API_TOKEN in your Railway environment variables');
  console.log('6. Wait for Railway to redeploy');
  console.log('\n═══════════════════════════════════════════════════════\n');
}

testToken().catch(error => {
  console.error('\n💥 Unexpected error:', error.message);
  process.exit(1);
});

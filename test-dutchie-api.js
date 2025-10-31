/**
 * Quick test script to verify Dutchie API connection and data structure
 * Run with: node test-dutchie-api.js
 */

const https = require('https');

const API_KEY = '7b740c2ee6f94e698b2e7bbf8cf2ddb1';
const BASE_URL = 'api.pos.dutchie.com';

// Calculate date 24 hours ago
const fromDate = new Date();
fromDate.setHours(fromDate.getHours() - 24);
const fromDateUTC = fromDate.toISOString();

console.log('Testing Dutchie API Connection...');
console.log('='.repeat(50));

/**
 * Make API request
 */
function makeRequest(path, params = {}) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;

    const options = {
      hostname: BASE_URL,
      path: fullPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    console.log(`\nRequesting: https://${BASE_URL}${fullPath}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Headers:`, JSON.stringify(res.headers, null, 2));

        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          console.log('Raw response:', data);
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testAPI() {
  try {
    // Test 1: Products endpoint with date filtering
    console.log('\n' + '='.repeat(50));
    console.log('TEST 1: Products Endpoint');
    console.log('='.repeat(50));
    console.log(`Looking back 24 hours from: ${fromDateUTC}`);

    const productsResponse = await makeRequest('/products', {
      fromLastModifiedDateUTC: fromDateUTC,
      isActive: true,
    });

    console.log('\n--- Products Response ---');
    if (productsResponse.statusCode === 200) {
      const products = productsResponse.data.data || productsResponse.data;
      console.log(`✓ Success! Found ${Array.isArray(products) ? products.length : 'unknown'} products`);

      if (Array.isArray(products) && products.length > 0) {
        console.log('\nFirst Product Sample:');
        console.log(JSON.stringify(products[0], null, 2));

        console.log('\nProduct Structure Keys:');
        console.log(Object.keys(products[0]).join(', '));
      } else {
        console.log('No products found. Full response:');
        console.log(JSON.stringify(productsResponse.data, null, 2));
      }
    } else {
      console.log(`✗ Error: Status ${productsResponse.statusCode}`);
      console.log(JSON.stringify(productsResponse.data, null, 2));
    }

    // Test 2: Discounts endpoint
    console.log('\n' + '='.repeat(50));
    console.log('TEST 2: Discounts Endpoint');
    console.log('='.repeat(50));

    const discountsResponse = await makeRequest('/discounts', {
      includeInactive: false,
      includeInclusionExclusionData: true,
    });

    console.log('\n--- Discounts Response ---');
    if (discountsResponse.statusCode === 200) {
      const discounts = discountsResponse.data.data || discountsResponse.data;
      console.log(`✓ Success! Found ${Array.isArray(discounts) ? discounts.length : 'unknown'} discounts`);

      if (Array.isArray(discounts) && discounts.length > 0) {
        console.log('\nFirst Discount Sample:');
        console.log(JSON.stringify(discounts[0], null, 2));

        console.log('\nDiscount Structure Keys:');
        console.log(Object.keys(discounts[0]).join(', '));
      } else {
        console.log('No discounts found. Full response:');
        console.log(JSON.stringify(discountsResponse.data, null, 2));
      }
    } else {
      console.log(`✗ Error: Status ${discountsResponse.statusCode}`);
      console.log(JSON.stringify(discountsResponse.data, null, 2));
    }

    // Test 3: Try without date filter to see if we get more products
    console.log('\n' + '='.repeat(50));
    console.log('TEST 3: Products Without Date Filter');
    console.log('='.repeat(50));

    const allProductsResponse = await makeRequest('/products', {
      isActive: true,
    });

    if (allProductsResponse.statusCode === 200) {
      const allProducts = allProductsResponse.data.data || allProductsResponse.data;
      console.log(`✓ Found ${Array.isArray(allProducts) ? allProducts.length : 'unknown'} total active products`);
    } else {
      console.log(`✗ Error: Status ${allProductsResponse.statusCode}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('API Testing Complete!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n✗ Error during API test:', error.message);
    console.error(error);
  }
}

testAPI();

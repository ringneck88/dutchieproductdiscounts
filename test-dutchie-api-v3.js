/**
 * Test script v3 - Using Basic Authentication
 * Run with: node test-dutchie-api-v3.js
 */

const https = require('https');

const API_KEY = '7b740c2ee6f94e698b2e7bbf8cf2ddb1';
const BASE_URL = 'api.pos.dutchie.com';

// For Basic Auth, encode "apikey:" in Base64
const basicAuthString = Buffer.from(`${API_KEY}:`).toString('base64');

console.log('Testing Dutchie API with Basic Authentication...');
console.log('='.repeat(50));
console.log(`API Key: ${API_KEY}`);
console.log(`Basic Auth String: ${basicAuthString}`);
console.log('='.repeat(50));

// Calculate date 24 hours ago for product filtering
const fromDate = new Date();
fromDate.setHours(fromDate.getHours() - 24);
const fromDateUTC = fromDate.toISOString();

/**
 * Make API request with Basic Auth
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
        'Accept': 'text/plain',
        'Authorization': `Basic ${basicAuthString}`,
        'Content-Type': 'application/json',
      },
    };

    console.log(`\nRequesting: https://${BASE_URL}${fullPath}`);
    console.log(`Authorization: Basic ${basicAuthString}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`\nStatus Code: ${res.statusCode}`);

        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            console.log('✓ SUCCESS!\n');
            resolve({ statusCode: res.statusCode, data: jsonData });
          } catch (e) {
            console.log('✓ SUCCESS! (Non-JSON response)\n');
            console.log('First 500 chars:', data.substring(0, 500));
            resolve({ statusCode: res.statusCode, data: data });
          }
        } else {
          console.log(`✗ Error: Status ${res.statusCode}`);
          if (data) {
            console.log('Response:', data.substring(0, 500));
          }
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error('✗ Request error:', error.message);
      reject(error);
    });

    req.end();
  });
}

async function testAPI() {
  try {
    // Test 1: Discounts endpoint (from your curl example)
    console.log('\n' + '='.repeat(50));
    console.log('TEST 1: Discounts Endpoint (from curl example)');
    console.log('='.repeat(50));

    const discountsResponse = await makeRequest('/discounts', {
      includeInactive: false,
      includeInclusionExclusionData: true,
    });

    if (discountsResponse.statusCode === 200) {
      const discounts = discountsResponse.data.data || discountsResponse.data;
      console.log(`Found ${Array.isArray(discounts) ? discounts.length : 'unknown'} discounts`);

      if (Array.isArray(discounts) && discounts.length > 0) {
        console.log('\n--- First Discount Sample ---');
        console.log(JSON.stringify(discounts[0], null, 2));

        console.log('\n--- Discount Object Keys ---');
        console.log(Object.keys(discounts[0]).join(', '));
      } else {
        console.log('\nFull Response Structure:');
        console.log(JSON.stringify(discountsResponse.data, null, 2).substring(0, 1000));
      }
    }

    // Test 2: Products endpoint with date filtering
    console.log('\n' + '='.repeat(50));
    console.log('TEST 2: Products Endpoint (with 24hr lookback)');
    console.log('='.repeat(50));
    console.log(`Date filter: ${fromDateUTC}`);

    const productsResponse = await makeRequest('/products', {
      fromLastModifiedDateUTC: fromDateUTC,
      isActive: true,
    });

    if (productsResponse.statusCode === 200) {
      const products = productsResponse.data.data || productsResponse.data;
      console.log(`Found ${Array.isArray(products) ? products.length : 'unknown'} products (modified in last 24 hours)`);

      if (Array.isArray(products) && products.length > 0) {
        console.log('\n--- First Product Sample ---');
        console.log(JSON.stringify(products[0], null, 2));

        console.log('\n--- Product Object Keys ---');
        console.log(Object.keys(products[0]).join(', '));
      } else {
        console.log('\nNo products modified in last 24 hours. Full response:');
        console.log(JSON.stringify(productsResponse.data, null, 2).substring(0, 1000));
      }
    }

    // Test 3: Products without date filter (to see total count)
    console.log('\n' + '='.repeat(50));
    console.log('TEST 3: Products Endpoint (no date filter)');
    console.log('='.repeat(50));

    const allProductsResponse = await makeRequest('/products', {
      isActive: true,
    });

    if (allProductsResponse.statusCode === 200) {
      const allProducts = allProductsResponse.data.data || allProductsResponse.data;
      console.log(`Found ${Array.isArray(allProducts) ? allProducts.length : 'unknown'} total active products`);

      if (Array.isArray(allProducts) && allProducts.length > 0) {
        console.log('\nNote: This is the full product catalog (could be very large!)');
        console.log('The date filtering helps limit the response size.');
      }
    }

    // Test 4: Check for products with discounts
    console.log('\n' + '='.repeat(50));
    console.log('TEST 4: Products with Discounts Analysis');
    console.log('='.repeat(50));

    if (productsResponse.statusCode === 200 && discountsResponse.statusCode === 200) {
      const products = productsResponse.data.data || productsResponse.data || [];
      const discounts = discountsResponse.data.data || discountsResponse.data || [];

      if (Array.isArray(products) && Array.isArray(discounts)) {
        console.log(`Total products: ${products.length}`);
        console.log(`Total discounts: ${discounts.length}`);

        // Count products with discounts
        const productsWithDiscounts = products.filter(p => {
          return (p.discounts && p.discounts.length > 0) ||
                 discounts.some(d => d.applicableProducts?.includes(p.id));
        });

        console.log(`Products with discounts: ${productsWithDiscounts.length}`);

        if (productsWithDiscounts.length > 0) {
          console.log('\n--- Sample Product with Discount ---');
          console.log(JSON.stringify(productsWithDiscounts[0], null, 2));
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 API Testing Complete!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n✗ Error during API test:', error.message);
    console.error(error);
  }
}

testAPI();

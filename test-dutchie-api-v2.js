/**
 * Test script v2 - Try different authentication methods
 * Run with: node test-dutchie-api-v2.js [retailerId]
 */

const https = require('https');

const API_KEY = '7b740c2ee6f94e698b2e7bbf8cf2ddb1';
const BASE_URL = 'api.pos.dutchie.com';
const RETAILER_ID = process.argv[2]; // Optional: pass as command line argument

console.log('Testing Dutchie API with multiple auth methods...');
console.log('='.repeat(50));
console.log(`API Key: ${API_KEY}`);
console.log(`Retailer ID: ${RETAILER_ID || 'Not provided'}`);
console.log('='.repeat(50));

/**
 * Make API request with different auth methods
 */
function makeRequest(path, authMethod, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    };

    // Apply different auth methods
    switch (authMethod) {
      case 'bearer':
        options.headers['Authorization'] = `Bearer ${API_KEY}`;
        break;
      case 'api-key-header':
        options.headers['X-API-Key'] = API_KEY;
        break;
      case 'api-key-header2':
        options.headers['Api-Key'] = API_KEY;
        break;
      case 'dutchie-api-key':
        options.headers['Dutchie-API-Key'] = API_KEY;
        break;
      case 'query-param':
        path += (path.includes('?') ? '&' : '?') + `apiKey=${API_KEY}`;
        options.path = path;
        break;
    }

    console.log(`\n[${authMethod}] Requesting: https://${BASE_URL}${options.path}`);
    console.log(`Headers:`, JSON.stringify(options.headers, null, 2));

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);

        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`✓ SUCCESS!`);
            resolve({ statusCode: res.statusCode, data: jsonData, method: authMethod });
          } catch (e) {
            console.log(`✓ SUCCESS! (non-JSON response)`);
            console.log('Response:', data.substring(0, 200));
            resolve({ statusCode: res.statusCode, data: data, method: authMethod });
          }
        } else {
          console.log(`✗ Failed with status ${res.statusCode}`);
          if (data) {
            console.log('Response:', data.substring(0, 200));
          }
          resolve({ statusCode: res.statusCode, data: data, method: authMethod });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`✗ Request error:`, error.message);
      reject(error);
    });

    req.end();
  });
}

async function testAllMethods() {
  const authMethods = [
    'bearer',
    'api-key-header',
    'api-key-header2',
    'dutchie-api-key',
    'query-param'
  ];

  // Test paths - try with and without retailer ID
  const testPaths = [
    '/products?isActive=true',
    RETAILER_ID ? `/retailers/${RETAILER_ID}/products?isActive=true` : null,
    RETAILER_ID ? `/v1/retailers/${RETAILER_ID}/products?isActive=true` : null,
    '/discounts',
    RETAILER_ID ? `/retailers/${RETAILER_ID}/discounts` : null,
  ].filter(Boolean);

  console.log('\nTesting paths:');
  testPaths.forEach(path => console.log(`  - ${path}`));

  for (const path of testPaths) {
    console.log('\n' + '='.repeat(50));
    console.log(`Testing path: ${path}`);
    console.log('='.repeat(50));

    for (const method of authMethods) {
      try {
        const result = await makeRequest(path, method);

        if (result.statusCode === 200) {
          console.log('\n🎉 FOUND WORKING METHOD! 🎉');
          console.log(`Auth Method: ${method}`);
          console.log(`Path: ${path}`);

          // Show sample of data
          if (typeof result.data === 'object') {
            console.log('\nSample Response:');
            console.log(JSON.stringify(result.data, null, 2).substring(0, 500));
          }

          return; // Stop testing once we find a working method
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.log(`✗ Error:`, error.message);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('❌ No working authentication method found');
  console.log('='.repeat(50));
  console.log('\nNext steps:');
  console.log('1. Check if you need a Retailer ID (pass as argument)');
  console.log('2. Verify the API key is correct and active');
  console.log('3. Check Dutchie API documentation for correct auth method');
  console.log('4. The API might require IP whitelisting or additional setup');
}

testAllMethods();

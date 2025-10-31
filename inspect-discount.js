/**
 * Deep inspect a discount object to find how it associates with products
 */

const https = require('https');

const API_KEY = '7b740c2ee6f94e698b2e7bbf8cf2ddb1';
const BASE_URL = 'api.pos.dutchie.com';
const basicAuthString = Buffer.from(`${API_KEY}:`).toString('base64');

function makeRequest(path, params = {}) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;

    const options = {
      hostname: BASE_URL,
      path: fullPath,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuthString}`,
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function inspectDiscounts() {
  console.log('Fetching discounts...\n');

  const discounts = await makeRequest('/discounts', {
    includeInactive: false,
    includeInclusionExclusionData: true,
  });

  // Show first 3 discounts in full detail
  console.log('='.repeat(80));
  console.log('FULL DISCOUNT OBJECTS (first 3):');
  console.log('='.repeat(80));

  for (let i = 0; i < Math.min(3, discounts.length); i++) {
    console.log(`\nDiscount ${i + 1}: ${discounts[i].discountName}`);
    console.log(JSON.stringify(discounts[i], null, 2));
    console.log('\n' + '-'.repeat(80));
  }

  // Check all field names
  console.log('\n' + '='.repeat(80));
  console.log('ALL UNIQUE FIELDS ACROSS ALL DISCOUNTS:');
  console.log('='.repeat(80));

  const allFields = new Set();
  discounts.forEach(d => {
    Object.keys(d).forEach(key => allFields.add(key));
  });

  console.log(Array.from(allFields).sort().join('\n'));
}

inspectDiscounts().catch(console.error);

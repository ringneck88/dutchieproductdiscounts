/**
 * Analyze discount filters to understand why we have so many matches
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

async function analyzeDiscounts() {
  console.log('Fetching discounts...\n');

  const discounts = await makeRequest('/discounts', {
    includeInactive: false,
    includeInclusionExclusionData: true,
  });

  console.log(`Total active discounts: ${discounts.length}\n`);

  let noFilters = 0;
  let hasSpecificProducts = 0;
  let hasBrands = 0;
  let hasCategories = 0;
  let hasVendors = 0;
  let hasStrains = 0;
  let hasTags = 0;

  console.log('Analyzing discount filters...\n');

  discounts.forEach((discount, index) => {
    const filters = [];
    let hasAnyFilter = false;

    if (discount.products && discount.products.ids && discount.products.ids.length > 0) {
      hasSpecificProducts++;
      hasAnyFilter = true;
      filters.push(`Products: ${discount.products.ids.length} specific`);
    }

    if (discount.brands && discount.brands.ids && discount.brands.ids.length > 0) {
      hasBrands++;
      hasAnyFilter = true;
      filters.push(`Brands: ${discount.brands.ids.length}`);
    }

    if (discount.productCategories && discount.productCategories.ids && discount.productCategories.ids.length > 0) {
      hasCategories++;
      hasAnyFilter = true;
      filters.push(`Categories: ${discount.productCategories.ids.length}`);
    }

    if (discount.vendors && discount.vendors.ids && discount.vendors.ids.length > 0) {
      hasVendors++;
      hasAnyFilter = true;
      filters.push(`Vendors: ${discount.vendors.ids.length}`);
    }

    if (discount.strains && discount.strains.ids && discount.strains.ids.length > 0) {
      hasStrains++;
      hasAnyFilter = true;
      filters.push(`Strains: ${discount.strains.ids.length}`);
    }

    if (discount.tags && discount.tags.ids && discount.tags.ids.length > 0) {
      hasTags++;
      hasAnyFilter = true;
      filters.push(`Tags: ${discount.tags.ids.length}`);
    }

    if (!hasAnyFilter) {
      noFilters++;
      if (index < 10) { // Show first 10 no-filter discounts
        console.log(`[NO FILTERS] ${discount.discountName}`);
      }
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('DISCOUNT FILTER SUMMARY:');
  console.log('='.repeat(60));
  console.log(`Discounts with NO filters (apply to all): ${noFilters}`);
  console.log(`Discounts with specific products: ${hasSpecificProducts}`);
  console.log(`Discounts with brand filters: ${hasBrands}`);
  console.log(`Discounts with category filters: ${hasCategories}`);
  console.log(`Discounts with vendor filters: ${hasVendors}`);
  console.log(`Discounts with strain filters: ${hasStrains}`);
  console.log(`Discounts with tag filters: ${hasTags}`);
  console.log('='.repeat(60));

  console.log(`\n⚠️  ${noFilters} discounts apply to ALL products!`);
  console.log(`This is why we have so many matches.`);
}

analyzeDiscounts().catch(console.error);

/**
 * Generate a test HTML page with product-discount data from Dutchie API
 * Run with: node generate-test-page.js
 */

const https = require('https');
const fs = require('fs');

const API_KEY = '7b740c2ee6f94e698b2e7bbf8cf2ddb1';
const BASE_URL = 'api.pos.dutchie.com';
const basicAuthString = Buffer.from(`${API_KEY}:`).toString('base64');

console.log('Fetching data from Dutchie API...');

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
        'Authorization': `Basic ${basicAuthString}`,
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (e) {
            reject(new Error('Failed to parse JSON response'));
          }
        } else {
          reject(new Error(`API returned status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Match discounts to products
 */
function matchDiscountsToProducts(products, discounts) {
  const matches = [];

  for (const product of products) {
    // Skip if product doesn't allow automatic discounts
    if (product.allowAutomaticDiscounts === false) {
      continue;
    }

    for (const discount of discounts) {
      // Skip inactive discounts
      if (!discount.isActive) {
        continue;
      }

      let matchesAllFilters = true;

      // Discount filters are objects with { ids: [...], isExclusion: bool } structure

      // Check specific products filter
      if (discount.products && discount.products.ids && Array.isArray(discount.products.ids) && discount.products.ids.length > 0) {
        const matches = discount.products.ids.includes(product.productId);
        if (discount.products.isExclusion ? matches : !matches) {
          matchesAllFilters = false;
        }
      }

      // Check brand filter
      if (matchesAllFilters && discount.brands && discount.brands.ids && Array.isArray(discount.brands.ids) && discount.brands.ids.length > 0) {
        if (!product.brandId) {
          matchesAllFilters = false;
        } else {
          const matches = discount.brands.ids.includes(product.brandId);
          if (discount.brands.isExclusion ? matches : !matches) {
            matchesAllFilters = false;
          }
        }
      }

      // Check category filter (use categoryId, not category name)
      if (matchesAllFilters && discount.productCategories && discount.productCategories.ids && Array.isArray(discount.productCategories.ids) && discount.productCategories.ids.length > 0) {
        if (!product.categoryId) {
          matchesAllFilters = false;
        } else {
          const matches = discount.productCategories.ids.includes(product.categoryId);
          if (discount.productCategories.isExclusion ? matches : !matches) {
            matchesAllFilters = false;
          }
        }
      }

      // Check vendor filter
      if (matchesAllFilters && discount.vendors && discount.vendors.ids && Array.isArray(discount.vendors.ids) && discount.vendors.ids.length > 0) {
        if (!product.vendorId) {
          matchesAllFilters = false;
        } else {
          const matches = discount.vendors.ids.includes(product.vendorId);
          if (discount.vendors.isExclusion ? matches : !matches) {
            matchesAllFilters = false;
          }
        }
      }

      // Check strain filter
      if (matchesAllFilters && discount.strains && discount.strains.ids && Array.isArray(discount.strains.ids) && discount.strains.ids.length > 0) {
        if (!product.strainId) {
          matchesAllFilters = false;
        } else {
          const matches = discount.strains.ids.includes(product.strainId);
          if (discount.strains.isExclusion ? matches : !matches) {
            matchesAllFilters = false;
          }
        }
      }

      // Check tags filter
      if (matchesAllFilters && discount.tags && discount.tags.ids && Array.isArray(discount.tags.ids) && discount.tags.ids.length > 0) {
        if (!product.tags || !Array.isArray(product.tags) || product.tags.length === 0) {
          matchesAllFilters = false;
        } else {
          const hasMatchingTag = discount.tags.ids.some(tag => product.tags.includes(tag));
          if (discount.tags.isExclusion ? hasMatchingTag : !hasMatchingTag) {
            matchesAllFilters = false;
          }
        }
      }

      // If all filters passed, add this match
      if (matchesAllFilters) {
        matches.push({ product, discount });
      }
    }
  }

  return matches;
}

/**
 * Generate HTML
 */
function generateHTML(products, discounts, matches, totalMatchCount = null) {
  const matchCount = totalMatchCount || matches.length;
  const displayCount = matches.length;
  const productCount = products.length;
  const discountCount = discounts.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dutchie Product-Discount Test Data</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .stats {
      display: flex;
      gap: 20px;
      margin-top: 20px;
    }
    .stat-box {
      background: #f8f9fa;
      padding: 15px 25px;
      border-radius: 6px;
      border-left: 4px solid #007bff;
    }
    .stat-box h3 {
      color: #666;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 5px;
    }
    .stat-box p {
      color: #333;
      font-size: 28px;
      font-weight: bold;
    }
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .tab {
      background: white;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
    }
    .tab:hover {
      border-color: #007bff;
    }
    .tab.active {
      background: #007bff;
      color: white;
    }
    .content {
      display: none;
    }
    .content.active {
      display: block;
    }
    .match-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      gap: 20px;
    }
    .product-section {
      flex: 1;
      border-right: 2px solid #f0f0f0;
      padding-right: 20px;
    }
    .discount-section {
      flex: 1;
      padding-left: 20px;
    }
    .product-image, .discount-icon {
      width: 100px;
      height: 100px;
      object-fit: cover;
      border-radius: 6px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      margin-bottom: 10px;
    }
    h3 {
      color: #333;
      margin-bottom: 8px;
      font-size: 18px;
    }
    .brand {
      color: #666;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .price {
      color: #28a745;
      font-size: 24px;
      font-weight: bold;
      margin: 10px 0;
    }
    .discount-badge {
      background: #dc3545;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      display: inline-block;
      font-size: 14px;
      font-weight: bold;
    }
    .dates {
      color: #666;
      font-size: 13px;
      margin-top: 10px;
    }
    .filter-info {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 12px;
    }
    .no-matches {
      background: white;
      padding: 40px;
      border-radius: 8px;
      text-align: center;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dutchie Product-Discount Test Data</h1>
      <p style="color: #666; margin-top: 5px;">Testing API integration and discount matching logic</p>

      <div class="stats">
        <div class="stat-box">
          <h3>Products (24hr)</h3>
          <p>${productCount}</p>
        </div>
        <div class="stat-box">
          <h3>Active Discounts</h3>
          <p>${discountCount}</p>
        </div>
        <div class="stat-box" style="border-left-color: ${matchCount > 0 ? '#28a745' : '#dc3545'}">
          <h3>Product-Discount Matches</h3>
          <p>${matchCount}${matchCount > 100 ? ' (showing 100)' : ''}</p>
        </div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" onclick="showTab('matches')">Matched Products & Discounts</div>
      <div class="tab" onclick="showTab('products')">All Products</div>
      <div class="tab" onclick="showTab('discounts')">All Discounts</div>
    </div>

    <div id="matches" class="content active">
      ${matchCount > displayCount ? `<div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #ffc107;"><strong>⚠️ Note:</strong> Showing ${displayCount} of ${matchCount} total matches to keep file size manageable.</div>` : ''}
      ${matchCount > 0 ? matches.map(match => `
        <div class="match-card">
          <div class="product-section">
            ${match.product.imageUrl ?
              `<img src="${match.product.imageUrl}" class="product-image" alt="${match.product.productName}">` :
              '<div class="product-image">📦</div>'}
            <h3>${match.product.productName}</h3>
            <div class="brand">🏷️ ${match.product.brandName || 'No Brand'}</div>
            <div class="price">$${match.product.price || '0.00'}</div>
            <div style="color: #666; font-size: 13px;">
              Category: ${match.product.category || 'N/A'}<br>
              SKU: ${match.product.sku || 'N/A'}<br>
              Product ID: ${match.product.productId}
            </div>
          </div>
          <div class="discount-section">
            <div class="discount-icon">💰</div>
            <h3>${match.discount.discountName}</h3>
            <div class="discount-badge">
              ${match.discount.discountType || 'Discount'} - $${match.discount.discountAmount || '0'}
            </div>
            <div class="dates">
              ⏰ Valid: ${new Date(match.discount.validFrom).toLocaleDateString()} - ${new Date(match.discount.validUntil).toLocaleDateString()}
            </div>
            <div class="filter-info">
              <strong>Discount Filters:</strong><br>
              ${match.discount.products && match.discount.products.ids ? `Products: ${match.discount.products.ids.length} specific${match.discount.products.isExclusion ? ' (excluded)' : ''}<br>` : ''}
              ${match.discount.brands && match.discount.brands.ids ? `Brands: ${match.discount.brands.ids.length}${match.discount.brands.isExclusion ? ' (excluded)' : ''}<br>` : ''}
              ${match.discount.productCategories && match.discount.productCategories.ids ? `Categories: ${match.discount.productCategories.ids.length}${match.discount.productCategories.isExclusion ? ' (excluded)' : ''}<br>` : ''}
              ${match.discount.vendors && match.discount.vendors.ids ? `Vendors: ${match.discount.vendors.ids.length}${match.discount.vendors.isExclusion ? ' (excluded)' : ''}<br>` : ''}
              ${(!match.discount.products?.ids && !match.discount.brands?.ids && !match.discount.productCategories?.ids && !match.discount.vendors?.ids) ? 'No specific filters (applies broadly)' : ''}
            </div>
          </div>
        </div>
      `).join('') : '<div class="no-matches"><h2>No Matches Found</h2><p>No products match the current discount filters.</p></div>'}
    </div>

    <div id="products" class="content">
      ${products.slice(0, 50).map(product => `
        <div class="match-card">
          ${product.imageUrl ?
            `<img src="${product.imageUrl}" class="product-image" alt="${product.productName}">` :
            '<div class="product-image">📦</div>'}
          <div style="flex: 1;">
            <h3>${product.productName}</h3>
            <div class="brand">🏷️ ${product.brandName || 'No Brand'}</div>
            <div class="price">$${product.price || '0.00'}</div>
            <div style="color: #666; font-size: 13px; margin-top: 10px;">
              Category: ${product.category || 'N/A'} |
              SKU: ${product.sku || 'N/A'} |
              ID: ${product.productId}<br>
              Allow Auto Discounts: ${product.allowAutomaticDiscounts !== false ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      `).join('')}
      ${products.length > 50 ? `<p style="text-align: center; padding: 20px; color: #666;">Showing first 50 of ${products.length} products</p>` : ''}
    </div>

    <div id="discounts" class="content">
      ${discounts.map(discount => `
        <div class="match-card">
          <div class="discount-icon">💰</div>
          <div style="flex: 1;">
            <h3>${discount.discountName}</h3>
            <div class="discount-badge">
              ${discount.discountType || 'Discount'} - $${discount.discountAmount || '0'}
            </div>
            <div class="dates">
              ⏰ ${new Date(discount.validFrom).toLocaleDateString()} - ${new Date(discount.validUntil).toLocaleDateString()}
            </div>
            <div class="filter-info">
              <strong>Applies to:</strong><br>
              ${discount.products && discount.products.ids ? `${discount.products.ids.length} specific products${discount.products.isExclusion ? ' (excluded)' : ''}<br>` : ''}
              ${discount.brands && discount.brands.ids ? `${discount.brands.ids.length} specific brands${discount.brands.isExclusion ? ' (excluded)' : ''}<br>` : ''}
              ${discount.productCategories && discount.productCategories.ids ? `${discount.productCategories.ids.length} categories${discount.productCategories.isExclusion ? ' (excluded)' : ''}<br>` : ''}
              ${discount.vendors && discount.vendors.ids ? `${discount.vendors.ids.length} specific vendors${discount.vendors.isExclusion ? ' (excluded)' : ''}<br>` : ''}
              ${discount.strains && discount.strains.ids ? `${discount.strains.ids.length} specific strains${discount.strains.isExclusion ? ' (excluded)' : ''}<br>` : ''}
              ${discount.tags && discount.tags.ids ? `${discount.tags.ids.length} tags${discount.tags.isExclusion ? ' (excluded)' : ''}<br>` : ''}
              ${(!discount.products?.ids && !discount.brands?.ids && !discount.productCategories?.ids && !discount.vendors?.ids && !discount.strains?.ids && !discount.tags?.ids) ? '<em>No filters - may apply broadly</em>' : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <script>
    function showTab(tabName) {
      // Hide all content
      document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

      // Show selected content
      document.getElementById(tabName).classList.add('active');
      event.target.classList.add('active');
    }
  </script>
</body>
</html>`;
}

async function main() {
  try {
    // Calculate date 24 hours ago
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - 24);
    const fromDateUTC = fromDate.toISOString();

    console.log('Fetching products (last 24 hours)...');
    const products = await makeRequest('/products', {
      fromLastModifiedDateUTC: fromDateUTC,
      isActive: true,
    });

    console.log(`✓ Fetched ${products.length} products`);

    console.log('Fetching discounts...');
    const discounts = await makeRequest('/discounts', {
      includeInactive: false,
      includeInclusionExclusionData: true,
    });

    console.log(`✓ Fetched ${discounts.length} discounts`);

    console.log('Matching products to discounts...');
    const matches = matchDiscountsToProducts(products, discounts);

    console.log(`✓ Found ${matches.length} product-discount matches`);

    // Limit matches to prevent huge HTML file
    const limitedMatches = matches.slice(0, 100);
    if (matches.length > 100) {
      console.log(`⚠️  Limiting to first 100 matches for display (out of ${matches.length} total)`);
    }

    console.log('Generating HTML...');
    const html = generateHTML(products, discounts, limitedMatches, matches.length);

    const outputPath = 'dutchie-test-data.html';
    fs.writeFileSync(outputPath, html);

    console.log(`\n✅ Success! HTML file generated: ${outputPath}`);
    console.log(`\nSummary:`);
    console.log(`  Products: ${products.length}`);
    console.log(`  Discounts: ${discounts.length}`);
    console.log(`  Total Matches: ${matches.length}`);
    console.log(`  Displayed Matches: ${limitedMatches.length}`);
    console.log(`\nOpen the file in your browser to view the results.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

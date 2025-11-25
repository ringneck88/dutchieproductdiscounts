import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

async function fetchSample() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Fetching stores from database...\n');

  // Get first store with API key
  const storeResult = await pool.query(`
    SELECT name, dutchie_store_id, dutchie_api_key
    FROM stores
    WHERE dutchie_api_key IS NOT NULL
    LIMIT 1
  `);

  if (storeResult.rows.length === 0) {
    console.log('No stores found with API key!');
    await pool.end();
    return;
  }

  const store = storeResult.rows[0];
  console.log(`Using store: ${store.name}`);
  console.log(`Retailer ID: ${store.dutchie_store_id}\n`);

  // Fetch discounts from Dutchie
  const basicAuthString = Buffer.from(`${store.dutchie_api_key}:`).toString('base64');

  console.log('Fetching discounts from Dutchie Reporting API...\n');

  try {
    const response = await axios.get('https://api.pos.dutchie.com/reporting/discounts', {
      headers: {
        'Authorization': `Basic ${basicAuthString}`,
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
      },
    });

    const discounts = Array.isArray(response.data) ? response.data : [];
    console.log(`Fetched ${discounts.length} discounts\n`);

    if (discounts.length === 0) {
      console.log('No discounts returned from API');
      await pool.end();
      return;
    }

    // Show first 2 discounts with all their fields
    console.log(`\n=== FIRST 2 DISCOUNTS FROM DUTCHIE (raw data) ===\n`);

    for (let i = 0; i < Math.min(2, discounts.length); i++) {
      const d = discounts[i];
      console.log(`\n--- Discount ${i + 1}: ${d.discountName || d.name} ---`);

      for (const [key, value] of Object.entries(d)) {
        const display = value === null || value === undefined ? 'null' :
                        typeof value === 'object' ? JSON.stringify(value).substring(0, 150) :
                        String(value).substring(0, 150);
        console.log(`  ${key}: ${display}`);
      }
    }

    // Find discounts with filter data
    console.log(`\n\n=== DISCOUNTS WITH FILTER DATA ===\n`);

    const withFilters = discounts.filter((d: any) =>
      d.products || d.productCategories || d.brands || d.vendors || d.strains ||
      d.includedProducts || d.includedCategories || d.includedBrands ||
      d.excludedProducts || d.excludedCategories || d.excludedBrands
    );

    console.log(`Found ${withFilters.length} discounts with filter data out of ${discounts.length} total`);

    if (withFilters.length > 0) {
      const d = withFilters[0];
      console.log(`\nSample with filters: ${d.discountName || d.name}`);
      for (const [key, value] of Object.entries(d)) {
        if (value !== null && value !== undefined) {
          const display = typeof value === 'object' ? JSON.stringify(value).substring(0, 200) :
                          String(value as any).substring(0, 200);
          console.log(`  ${key}: ${display}`);
        }
      }
    }

    // Check field names in discounts
    console.log(`\n\n=== ALL FIELD NAMES FOUND ===\n`);
    const allKeys = new Set<string>();
    discounts.slice(0, 50).forEach((d: any) => {
      Object.keys(d).forEach(k => allKeys.add(k));
    });
    console.log(Array.from(allKeys).sort().join(', '));

  } catch (error: any) {
    console.error('Error fetching from Dutchie:', error.message);
  }

  await pool.end();
}

fetchSample();

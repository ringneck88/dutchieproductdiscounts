import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('=== CHECKING DISCOUNT FILTER DATA ===\n');

  // Check for non-null filter columns
  const filterCols = ['products', 'product_categories', 'brands', 'vendors', 'strains', 'tags', 'inventory_tags'];

  for (const col of filterCols) {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM discounts WHERE ${col} IS NOT NULL
    `);
    console.log(`${col}: ${result.rows[0].count} non-null records`);
  }

  // Get sample discounts with filter data
  console.log('\n=== SAMPLE DISCOUNTS WITH FILTER DATA ===\n');

  const sample = await pool.query(`
    SELECT
      discount_id,
      discount_name,
      products,
      product_categories,
      brands,
      vendors,
      strains
    FROM discounts
    WHERE products IS NOT NULL
       OR product_categories IS NOT NULL
       OR brands IS NOT NULL
    LIMIT 5
  `);

  if (sample.rows.length === 0) {
    console.log('No discounts have filter data populated yet.');
    console.log('\nLet me check a sample discount to see all fields...\n');

    const anySample = await pool.query('SELECT * FROM discounts LIMIT 1');
    if (anySample.rows.length > 0) {
      console.log('Sample discount fields:');
      for (const [key, value] of Object.entries(anySample.rows[0])) {
        const display = value === null ? 'NULL' :
                        typeof value === 'object' ? JSON.stringify(value).substring(0, 100) :
                        String(value).substring(0, 100);
        console.log(`  ${key}: ${display}`);
      }
    }
  } else {
    sample.rows.forEach((r, i) => {
      console.log(`\nDiscount ${i + 1}: ${r.discount_name}`);
      console.log(`  ID: ${r.discount_id}`);
      if (r.products) console.log(`  Products: ${JSON.stringify(r.products).substring(0, 100)}`);
      if (r.product_categories) console.log(`  Categories: ${JSON.stringify(r.product_categories).substring(0, 100)}`);
      if (r.brands) console.log(`  Brands: ${JSON.stringify(r.brands).substring(0, 100)}`);
      if (r.vendors) console.log(`  Vendors: ${JSON.stringify(r.vendors).substring(0, 100)}`);
      if (r.strains) console.log(`  Strains: ${JSON.stringify(r.strains).substring(0, 100)}`);
    });
  }

  // Count total discounts
  const total = await pool.query('SELECT COUNT(*) FROM discounts');
  console.log(`\n\nTotal discounts in database: ${total.rows[0].count}`);

  await pool.end();
}

check();

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function addColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Adding filter columns to discounts table...\n');

  const columns = [
    'products JSONB',           // Array of product IDs this discount applies to
    'product_categories JSONB', // Array of category names/IDs
    'brands JSONB',             // Array of brand names/IDs
    'vendors JSONB',            // Array of vendor names/IDs
    'strains JSONB',            // Array of strain names/IDs
    'tags JSONB',               // Array of tags
    'inventory_tags JSONB',     // Array of inventory tags
  ];

  for (const col of columns) {
    const [name] = col.split(' ');
    try {
      await pool.query(`ALTER TABLE discounts ADD COLUMN IF NOT EXISTS ${col}`);
      console.log(`✅ Added column: ${name}`);
    } catch (err: any) {
      console.log(`⚠️ Column ${name}: ${err.message}`);
    }
  }

  // Verify
  console.log('\nVerifying columns...');
  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'discounts'
    AND column_name IN ('products', 'product_categories', 'brands', 'vendors', 'strains', 'tags', 'inventory_tags')
  `);
  console.log('Filter columns now in table:', result.rows.map(r => r.column_name).join(', '));

  await pool.end();
  console.log('\n✅ Done!');
}

addColumns();

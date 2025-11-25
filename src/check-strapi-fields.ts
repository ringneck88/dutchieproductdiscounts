import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Get a sample record with all fields
  const sample = await pool.query(`
    SELECT *
    FROM inventories
    LIMIT 1
  `);

  if (sample.rows.length > 0) {
    console.log('Sample inventory record (all fields):');
    const row = sample.rows[0];
    for (const [key, value] of Object.entries(row)) {
      const displayValue = value === null ? '(NULL)' :
                          value instanceof Date ? value.toISOString() :
                          typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' :
                          value;
      console.log(`  ${key}: ${displayValue}`);
    }
  }

  // Check locale field
  const localeCheck = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE locale IS NOT NULL) as has_locale,
      COUNT(*) FILTER (WHERE locale IS NULL) as no_locale
    FROM inventories
  `);

  console.log('\nLocale field:');
  console.log('  Has locale:', localeCheck.rows[0].has_locale);
  console.log('  No locale:', localeCheck.rows[0].no_locale);

  // Check if there's a documents table (Strapi v5)
  const tablesResult = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE '%inventories%'
    ORDER BY table_name
  `);

  console.log('\nInventory-related tables:');
  tablesResult.rows.forEach(r => console.log('  ', r.table_name));

  await pool.end();
}

check();

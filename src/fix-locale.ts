import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Check inventories_cmps table
  console.log('Checking inventories_cmps table...');
  const cmpsResult = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'inventories_cmps'
    ORDER BY ordinal_position
  `);
  console.log('inventories_cmps columns:');
  cmpsResult.rows.forEach(r => console.log('  ', r.column_name));

  // Check if there are any records in cmps
  const cmpsCount = await pool.query('SELECT COUNT(*) FROM inventories_cmps');
  console.log('inventories_cmps record count:', cmpsCount.rows[0].count);

  // Set locale to 'en' for all records
  console.log('\nSetting locale to "en" for all inventory records...');
  const invResult = await pool.query(`
    UPDATE inventories SET locale = 'en' WHERE locale IS NULL
  `);
  console.log('Updated inventory records:', invResult.rowCount);

  console.log('Setting locale to "en" for all discount records...');
  const discResult = await pool.query(`
    UPDATE discounts SET locale = 'en' WHERE locale IS NULL
  `);
  console.log('Updated discount records:', discResult.rowCount);

  // Check all tables with 'discount' in name
  const discTables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE '%discount%'
    ORDER BY table_name
  `);
  console.log('\nDiscount-related tables:');
  discTables.rows.forEach(r => console.log('  ', r.table_name));

  await pool.end();
  console.log('\n✅ Done!');
}

fix();

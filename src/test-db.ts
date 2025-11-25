/**
 * Quick database test - bypasses Strapi to test DB directly
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function testDatabase() {
  console.log('Testing Database Connection...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Get discount table columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'discounts'
      ORDER BY ordinal_position
    `);

    console.log('📋 Discounts table columns:');
    console.log('─'.repeat(50));
    for (const row of columnsResult.rows) {
      console.log(`  ${row.column_name} (${row.data_type})`);
    }
    console.log('─'.repeat(50));
    console.log(`Total: ${columnsResult.rows.length} columns\n`);

    // Get inventory table columns for comparison
    const invColumnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'inventories'
      ORDER BY ordinal_position
    `);

    console.log('📋 Inventories table columns:');
    console.log('─'.repeat(50));
    for (const row of invColumnsResult.rows) {
      console.log(`  ${row.column_name} (${row.data_type})`);
    }
    console.log('─'.repeat(50));
    console.log(`Total: ${invColumnsResult.rows.length} columns\n`);

    // Count existing records
    const discountCount = await client.query('SELECT COUNT(*) FROM discounts');
    const inventoryCount = await client.query('SELECT COUNT(*) FROM inventories');

    console.log('📊 Current record counts:');
    console.log(`  Discounts: ${discountCount.rows[0].count}`);
    console.log(`  Inventories: ${inventoryCount.rows[0].count}`);

    client.release();
    await pool.end();

    console.log('\n✅ Database test complete!');

  } catch (error: any) {
    console.error('❌ Database error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testDatabase();

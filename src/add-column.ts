/**
 * Add applies_to_locations column to discounts table
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function addColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Adding applies_to_locations column to discounts table...');

    // Add the column (JSONB for efficient querying)
    await pool.query(`
      ALTER TABLE discounts
      ADD COLUMN IF NOT EXISTS applies_to_locations JSONB
    `);

    console.log('✅ Column added successfully!');

    // Verify
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'discounts'
      AND column_name = 'applies_to_locations'
    `);

    if (result.rows.length > 0) {
      console.log(`   Column type: ${result.rows[0].data_type}`);
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  }

  await pool.end();
}

addColumn();

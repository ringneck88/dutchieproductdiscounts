import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function cleanup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Delete test records and records with null applies_to_locations
  const result = await pool.query(`
    DELETE FROM discounts
    WHERE applies_to_locations IS NULL
    OR discount_id LIKE 'test-%'
  `);
  console.log('Cleaned up', result.rowCount, 'records');

  const count = await pool.query('SELECT COUNT(*) FROM discounts');
  console.log('Remaining discounts:', count.rows[0].count);

  await pool.end();
}

cleanup();

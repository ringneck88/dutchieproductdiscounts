import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Setting updated_by_id = 1...');

  const inv = await pool.query('UPDATE inventories SET updated_by_id = 1 WHERE updated_by_id IS NULL');
  console.log('Inventories updated:', inv.rowCount);

  const disc = await pool.query('UPDATE discounts SET updated_by_id = 1 WHERE updated_by_id IS NULL');
  console.log('Discounts updated:', disc.rowCount);

  await pool.end();
  console.log('Done! Try Strapi now.');
}

fix();

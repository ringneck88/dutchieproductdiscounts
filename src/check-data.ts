import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const result = await pool.query('SELECT discount_id, discount_name, applies_to_locations FROM discounts LIMIT 5');
  console.log('Sample discounts:\n');
  result.rows.forEach(r => {
    console.log('  ID:', r.discount_id);
    console.log('  Name:', r.discount_name);
    console.log('  Locations:', JSON.stringify(r.applies_to_locations));
    console.log('');
  });

  await pool.end();
}

check();

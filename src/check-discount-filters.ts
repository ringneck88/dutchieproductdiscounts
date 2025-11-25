import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Get all discount columns
  const cols = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'discounts'
    ORDER BY ordinal_position
  `);

  console.log('All discount columns:');
  cols.rows.forEach(r => console.log(' ', r.column_name));

  // Check a sample discount to see what data we have
  console.log('\n\nSample discount data:');
  const sample = await pool.query('SELECT * FROM discounts LIMIT 1');
  if (sample.rows.length > 0) {
    for (const [key, value] of Object.entries(sample.rows[0])) {
      if (value !== null) {
        const display = typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : String(value).substring(0, 100);
        console.log(`  ${key}: ${display}`);
      }
    }
  }

  await pool.end();
}

check();

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Check inventory
  const invResult = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE published_at IS NOT NULL) as published,
      COUNT(*) FILTER (WHERE published_at IS NULL) as unpublished
    FROM inventories
  `);

  console.log('Inventory records:');
  console.log('  Published (visible in Strapi):', invResult.rows[0].published);
  console.log('  Unpublished (hidden):', invResult.rows[0].unpublished);

  // Check discounts
  const discResult = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE published_at IS NOT NULL) as published,
      COUNT(*) FILTER (WHERE published_at IS NULL) as unpublished
    FROM discounts
  `);

  console.log('\nDiscount records:');
  console.log('  Published (visible in Strapi):', discResult.rows[0].published);
  console.log('  Unpublished (hidden):', discResult.rows[0].unpublished);

  await pool.end();
}

check();

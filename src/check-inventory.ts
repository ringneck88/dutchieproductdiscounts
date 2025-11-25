import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Check sample inventory records
  const result = await pool.query(`
    SELECT inventory_id, product_name, dutchie_store_id
    FROM inventories
    LIMIT 10
  `);

  console.log('Sample inventory records:\n');
  result.rows.forEach(r => {
    console.log('  ID:', r.inventory_id);
    console.log('  Name:', r.product_name?.substring(0, 40));
    console.log('  Store ID:', r.dutchie_store_id || '(NULL)');
    console.log('');
  });

  // Count by store
  const counts = await pool.query(`
    SELECT dutchie_store_id, COUNT(*) as count
    FROM inventories
    GROUP BY dutchie_store_id
  `);

  console.log('Inventory count by store:');
  counts.rows.forEach(r => {
    console.log(`  ${r.dutchie_store_id || '(NULL)'}: ${r.count}`);
  });

  await pool.end();
}

check();

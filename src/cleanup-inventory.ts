import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function cleanup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Cleaning up inventory records with NULL dutchie_store_id...\n');

  // Delete records with null dutchie_store_id
  const result = await pool.query(`
    DELETE FROM inventories
    WHERE dutchie_store_id IS NULL
  `);

  console.log('Deleted', result.rowCount, 'records with NULL store ID\n');

  // Show remaining counts
  const counts = await pool.query(`
    SELECT dutchie_store_id, COUNT(*) as count
    FROM inventories
    GROUP BY dutchie_store_id
    ORDER BY count DESC
  `);

  console.log('Remaining inventory by store:');
  let total = 0;
  counts.rows.forEach(r => {
    console.log(`  ${r.dutchie_store_id}: ${r.count}`);
    total += parseInt(r.count);
  });
  console.log(`\nTotal: ${total} records`);

  await pool.end();
}

cleanup();

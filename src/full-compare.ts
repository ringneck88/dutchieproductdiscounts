import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Get ALL columns and values for a store record
  console.log('=== STORE RECORD (works in Strapi) ===');
  const store = await pool.query('SELECT * FROM stores LIMIT 1');
  if (store.rows.length > 0) {
    for (const [key, value] of Object.entries(store.rows[0])) {
      const display = value === null ? 'NULL' :
                      typeof value === 'object' ? JSON.stringify(value).substring(0, 50) :
                      String(value).substring(0, 50);
      console.log(`  ${key}: ${display}`);
    }
  }

  console.log('\n=== INVENTORY RECORD (not working) ===');
  const inv = await pool.query('SELECT * FROM inventories LIMIT 1');
  if (inv.rows.length > 0) {
    for (const [key, value] of Object.entries(inv.rows[0])) {
      const display = value === null ? 'NULL' :
                      typeof value === 'object' ? JSON.stringify(value).substring(0, 50) :
                      String(value).substring(0, 50);
      console.log(`  ${key}: ${display}`);
    }
  }

  // Check updated_by_id
  console.log('\n=== Checking updated_by_id ===');
  const storeUpdated = await pool.query('SELECT updated_by_id FROM stores LIMIT 1');
  const invUpdated = await pool.query('SELECT updated_by_id FROM inventories LIMIT 1');
  console.log('Store updated_by_id:', storeUpdated.rows[0]?.updated_by_id);
  console.log('Inventory updated_by_id:', invUpdated.rows[0]?.updated_by_id);

  await pool.end();
}

check();

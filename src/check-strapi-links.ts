import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // List ALL tables in the database
  console.log('All tables in database:');
  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  tables.rows.forEach(r => console.log('  ', r.table_name));

  // Check strapi_core_store_settings for content type info
  console.log('\n\nChecking Strapi internal tables...');

  try {
    const coreStore = await pool.query(`
      SELECT key, value
      FROM strapi_core_store_settings
      WHERE key LIKE '%inventory%' OR key LIKE '%discount%'
      LIMIT 5
    `);
    console.log('Strapi core store settings:');
    coreStore.rows.forEach(r => console.log(`  ${r.key}`));
  } catch (e) {
    console.log('  strapi_core_store_settings not accessible');
  }

  await pool.end();
}

check();

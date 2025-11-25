import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Check stores table - these should show in Strapi
  console.log('Checking stores (should work in Strapi admin):');
  const storesSample = await pool.query(`
    SELECT id, document_id, name, locale, published_at, created_by_id
    FROM stores
    LIMIT 3
  `);
  storesSample.rows.forEach(r => {
    console.log(`  id=${r.id}, doc_id=${r.document_id}, name=${r.name}`);
    console.log(`    locale=${r.locale}, published=${r.published_at ? 'yes' : 'no'}, created_by=${r.created_by_id}`);
  });

  // Check inventories
  console.log('\nChecking inventories (not showing in Strapi admin):');
  const invSample = await pool.query(`
    SELECT id, document_id, inventory_id, locale, published_at, created_by_id
    FROM inventories
    LIMIT 3
  `);
  invSample.rows.forEach(r => {
    console.log(`  id=${r.id}, doc_id=${r.document_id}, inv_id=${r.inventory_id}`);
    console.log(`    locale=${r.locale}, published=${r.published_at ? 'yes' : 'no'}, created_by=${r.created_by_id}`);
  });

  // Check if stores have entries in stores_cmps
  console.log('\nChecking stores_cmps entries:');
  const storesCmps = await pool.query('SELECT COUNT(*) FROM stores_cmps');
  console.log('  stores_cmps count:', storesCmps.rows[0].count);

  // Check inventories_cmps
  console.log('\nChecking inventories_cmps entries:');
  const invCmps = await pool.query('SELECT COUNT(*) FROM inventories_cmps');
  console.log('  inventories_cmps count:', invCmps.rows[0].count);

  // Check document_id format
  console.log('\nComparing document_id format:');
  const storeDocId = await pool.query('SELECT document_id FROM stores LIMIT 1');
  const invDocId = await pool.query('SELECT document_id FROM inventories LIMIT 1');
  console.log('  Store document_id:', storeDocId.rows[0]?.document_id);
  console.log('  Inventory document_id:', invDocId.rows[0]?.document_id);

  await pool.end();
}

check();

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Check inventory document_id
  const invResult = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE document_id IS NOT NULL AND document_id != '') as has_doc_id,
      COUNT(*) FILTER (WHERE document_id IS NULL OR document_id = '') as missing_doc_id
    FROM inventories
  `);

  console.log('Inventory document_id:');
  console.log('  Has document_id:', invResult.rows[0].has_doc_id);
  console.log('  Missing document_id:', invResult.rows[0].missing_doc_id);

  // Sample some records
  const sample = await pool.query(`
    SELECT id, document_id, inventory_id, product_name
    FROM inventories
    LIMIT 5
  `);

  console.log('\nSample inventory records:');
  sample.rows.forEach((r: any) => {
    console.log(`  id=${r.id}, document_id=${r.document_id || '(NULL)'}, inventory_id=${r.inventory_id}`);
  });

  // Check discounts
  const discResult = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE document_id IS NOT NULL AND document_id != '') as has_doc_id,
      COUNT(*) FILTER (WHERE document_id IS NULL OR document_id = '') as missing_doc_id
    FROM discounts
  `);

  console.log('\nDiscount document_id:');
  console.log('  Has document_id:', discResult.rows[0].has_doc_id);
  console.log('  Missing document_id:', discResult.rows[0].missing_doc_id);

  await pool.end();
}

check();

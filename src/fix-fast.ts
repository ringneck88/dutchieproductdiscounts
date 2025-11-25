import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Fixing document_id format and created_by_id (fast method)...\n');

  // Use PostgreSQL function to generate random string
  // Update all at once using SQL
  console.log('Updating inventory document_id and created_by_id...');
  const invResult = await pool.query(`
    UPDATE inventories
    SET
      document_id = lower(substring(md5(random()::text || id::text) for 24)),
      created_by_id = 1
    WHERE document_id LIKE '%-%' OR created_by_id IS NULL
  `);
  console.log(`  Updated ${invResult.rowCount} inventory records`);

  console.log('Updating discount document_id and created_by_id...');
  const discResult = await pool.query(`
    UPDATE discounts
    SET
      document_id = lower(substring(md5(random()::text || id::text) for 24)),
      created_by_id = 1
    WHERE document_id LIKE '%-%' OR created_by_id IS NULL
  `);
  console.log(`  Updated ${discResult.rowCount} discount records`);

  // Verify
  console.log('\nVerifying...');
  const invSample = await pool.query('SELECT id, document_id, created_by_id FROM inventories LIMIT 3');
  console.log('Inventory samples:');
  invSample.rows.forEach(r => {
    console.log(`  id=${r.id}, doc_id=${r.document_id}, created_by=${r.created_by_id}`);
  });

  const discSample = await pool.query('SELECT id, document_id, created_by_id FROM discounts LIMIT 3');
  console.log('Discount samples:');
  discSample.rows.forEach(r => {
    console.log(`  id=${r.id}, doc_id=${r.document_id}, created_by=${r.created_by_id}`);
  });

  await pool.end();
  console.log('\n✅ Done! Try Strapi admin now.');
}

fix();

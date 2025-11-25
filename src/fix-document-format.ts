import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

// Generate Strapi v5 style document_id (24 char alphanumeric)
function generateStrapiDocumentId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function fix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Fixing document_id format and created_by_id...\n');

  // Fix inventory records in batches
  console.log('Updating inventory records...');
  let invUpdated = 0;

  // Get all inventory IDs
  const invIds = await pool.query('SELECT id FROM inventories');

  for (const row of invIds.rows) {
    const newDocId = generateStrapiDocumentId();
    await pool.query(
      'UPDATE inventories SET document_id = $1, created_by_id = 1 WHERE id = $2',
      [newDocId, row.id]
    );
    invUpdated++;
    if (invUpdated % 5000 === 0) {
      console.log(`  Updated ${invUpdated}/${invIds.rows.length} inventory records...`);
    }
  }
  console.log(`  Updated ${invUpdated} inventory records`);

  // Fix discount records
  console.log('Updating discount records...');
  let discUpdated = 0;

  const discIds = await pool.query('SELECT id FROM discounts');

  for (const row of discIds.rows) {
    const newDocId = generateStrapiDocumentId();
    await pool.query(
      'UPDATE discounts SET document_id = $1, created_by_id = 1 WHERE id = $2',
      [newDocId, row.id]
    );
    discUpdated++;
    if (discUpdated % 500 === 0) {
      console.log(`  Updated ${discUpdated}/${discIds.rows.length} discount records...`);
    }
  }
  console.log(`  Updated ${discUpdated} discount records`);

  // Verify
  console.log('\nVerifying...');
  const invSample = await pool.query('SELECT id, document_id, created_by_id FROM inventories LIMIT 3');
  console.log('Inventory samples:');
  invSample.rows.forEach(r => {
    console.log(`  id=${r.id}, doc_id=${r.document_id}, created_by=${r.created_by_id}`);
  });

  await pool.end();
  console.log('\n✅ Done! Try Strapi admin now.');
}

fix();

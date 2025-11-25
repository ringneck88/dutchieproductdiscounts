import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
dotenv.config();

async function fix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Fixing document_id for all records...\n');

  // Fix inventory records - generate UUID for each
  console.log('Updating inventory records...');
  const invResult = await pool.query(`
    UPDATE inventories
    SET document_id = gen_random_uuid()::text
    WHERE document_id IS NULL OR document_id = ''
  `);
  console.log(`  Updated ${invResult.rowCount} inventory records`);

  // Fix discount records
  console.log('Updating discount records...');
  const discResult = await pool.query(`
    UPDATE discounts
    SET document_id = gen_random_uuid()::text
    WHERE document_id IS NULL OR document_id = ''
  `);
  console.log(`  Updated ${discResult.rowCount} discount records`);

  // Verify
  const verify = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM inventories WHERE document_id IS NOT NULL) as inv_count,
      (SELECT COUNT(*) FROM discounts WHERE document_id IS NOT NULL) as disc_count
  `);

  console.log('\nVerification:');
  console.log(`  Inventories with document_id: ${verify.rows[0].inv_count}`);
  console.log(`  Discounts with document_id: ${verify.rows[0].disc_count}`);

  await pool.end();
  console.log('\n✅ Done! Records should now appear in Strapi.');
}

fix();

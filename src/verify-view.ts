import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function verify() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('=== VERIFYING PRODUCT_DISCOUNTS VIEW ===\n');

  // Check the unknown match type
  console.log('--- Investigating "unknown" match type ---\n');
  const unknownSample = await pool.query(`
    SELECT
      pd.product_name,
      pd.product_id,
      pd.category_id,
      pd.brand_id,
      pd.discount_name,
      pd.discount_id,
      d.products,
      d.product_categories,
      d.brands
    FROM product_discounts pd
    JOIN discounts d ON pd.discount_id = d.discount_id
    WHERE pd.match_type = 'unknown'
    LIMIT 5
  `);

  unknownSample.rows.forEach(r => {
    console.log(`Product: ${r.product_name?.substring(0, 40)}`);
    console.log(`  product_id: ${r.product_id}, category_id: ${r.category_id}, brand_id: ${r.brand_id}`);
    console.log(`  Discount: ${r.discount_name}`);
    console.log(`  products filter: ${JSON.stringify(r.products)?.substring(0, 100)}`);
    console.log(`  categories filter: ${JSON.stringify(r.product_categories)?.substring(0, 100)}`);
    console.log(`  brands filter: ${JSON.stringify(r.brands)?.substring(0, 100)}`);
    console.log('');
  });

  // Check unique products per store
  console.log('\n--- Unique products vs total rows per store ---\n');
  const storeStats = await pool.query(`
    SELECT
      dutchie_store_id,
      COUNT(*) as total_rows,
      COUNT(DISTINCT inventory_id) as unique_products,
      COUNT(DISTINCT discount_id) as unique_discounts
    FROM product_discounts
    GROUP BY dutchie_store_id
    ORDER BY total_rows DESC
    LIMIT 5
  `);

  storeStats.rows.forEach(r => {
    console.log(`Store: ${r.dutchie_store_id?.substring(0, 20)}...`);
    console.log(`  Total rows: ${r.total_rows}`);
    console.log(`  Unique products: ${r.unique_products}`);
    console.log(`  Unique discounts: ${r.unique_discounts}`);
    console.log(`  Avg discounts per product: ${(r.total_rows / r.unique_products).toFixed(1)}`);
    console.log('');
  });

  // Show a sample product with all its discounts
  console.log('\n--- Sample product with all applicable discounts ---\n');
  const sampleProduct = await pool.query(`
    SELECT product_name, inventory_id
    FROM product_discounts
    WHERE match_type IN ('category', 'brand', 'product')
    LIMIT 1
  `);

  if (sampleProduct.rows.length > 0) {
    const invId = sampleProduct.rows[0].inventory_id;
    console.log(`Product: ${sampleProduct.rows[0].product_name}`);
    console.log(`Inventory ID: ${invId}\n`);

    const discounts = await pool.query(`
      SELECT discount_name, discount_amount, discount_type, match_type
      FROM product_discounts
      WHERE inventory_id = $1
      ORDER BY match_type
    `, [invId]);

    console.log(`This product has ${discounts.rows.length} applicable discounts:`);
    discounts.rows.forEach(d => {
      console.log(`  - ${d.discount_name} (${d.discount_amount} ${d.discount_type}) [${d.match_type}]`);
    });
  }

  await pool.end();
}

verify();

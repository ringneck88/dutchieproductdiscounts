import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function createView() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Creating product_discounts view with proper matching logic...\n');

  // Drop existing view if exists
  await pool.query('DROP MATERIALIZED VIEW IF EXISTS product_discounts CASCADE');
  console.log('Dropped existing view');

  // Create materialized view that joins inventory with discounts
  // A discount applies to an inventory item if:
  // 1. The discount's applies_to_locations contains the same store as the inventory item
  // 2. AND one of:
  //    a. No product/category/brand filters are set (discount applies to all products in store)
  //    b. Product filter matches: products->>'ids' contains the inventory's product_id (and isExclusion = false)
  //    c. Category filter matches: product_categories->>'ids' contains the inventory's category_id (and isExclusion = false)
  //    d. Brand filter matches: brands->>'ids' contains the inventory's brand_id (and isExclusion = false)
  //
  // Note: Exclusion filters (isExclusion = true) mean "all EXCEPT these" - we handle this by inverting the logic

  const createViewSQL = `
    CREATE MATERIALIZED VIEW product_discounts AS
    SELECT
      -- Inventory fields
      i.id as inventory_pk,
      i.inventory_id,
      i.dutchie_store_id,
      i.product_id,
      i.product_name,
      i.sku,
      i.description,
      i.category_id,
      i.category,
      i.master_category,
      i.brand_id,
      i.brand_name,
      i.strain,
      i.strain_type,
      i.image_url,
      i.quantity_available,
      i.unit_price,
      i.med_unit_price,
      i.rec_unit_price,
      i.unit_weight,
      i.unit_weight_unit,
      i.effective_potency_mg,
      i.is_cannabis,
      i.medical_only,

      -- Discount fields (NULL if no discount)
      d.id as discount_pk,
      d.discount_id,
      d.discount_name,
      d.discount_code,
      d.discount_amount,
      d.discount_type,
      d.discount_method,
      d.application_method,
      d.is_active as discount_is_active,
      d.is_available_online as discount_is_available_online,
      d.valid_from as discount_valid_from,
      d.valid_until as discount_valid_until,
      d.threshold_type,
      d.minimum_items_required,
      d.maximum_items_allowed,
      d.first_time_customer_only,
      d.stack_on_other_discounts,

      -- Match type indicator (for debugging/analysis)
      CASE
        WHEN d.products IS NOT NULL AND d.products->>'ids' IS NOT NULL
             AND i.product_id IS NOT NULL
             AND d.products->'ids' @> to_jsonb(i.product_id::int) THEN 'product'
        WHEN d.product_categories IS NOT NULL AND d.product_categories->>'ids' IS NOT NULL
             AND i.category_id IS NOT NULL
             AND d.product_categories->'ids' @> to_jsonb(i.category_id::int) THEN 'category'
        WHEN d.brands IS NOT NULL AND d.brands->>'ids' IS NOT NULL
             AND i.brand_id IS NOT NULL
             AND d.brands->'ids' @> to_jsonb(i.brand_id::int) THEN 'brand'
        WHEN d.products IS NULL AND d.product_categories IS NULL AND d.brands IS NULL THEN 'store_wide'
        ELSE 'unknown'
      END as match_type

    FROM inventories i
    LEFT JOIN discounts d ON (
      -- Match by store: discount applies_to_locations contains inventory's store
      d.applies_to_locations @> jsonb_build_array(
        jsonb_build_object('dutchieStoreID', i.dutchie_store_id)
      )
      AND d.is_active = true
      AND d.is_deleted = false
      AND (
        -- Case 1: No filters set - discount applies to all products in store
        (d.products IS NULL AND d.product_categories IS NULL AND d.brands IS NULL)

        -- Case 2: Product filter (inclusion) - discount applies to specific products
        OR (
          d.products IS NOT NULL
          AND d.products->>'ids' IS NOT NULL
          AND (d.products->>'isExclusion')::boolean = false
          AND i.product_id IS NOT NULL
          AND d.products->'ids' @> to_jsonb(i.product_id::int)
        )

        -- Case 3: Product filter (exclusion) - discount applies to all EXCEPT these products
        OR (
          d.products IS NOT NULL
          AND d.products->>'ids' IS NOT NULL
          AND (d.products->>'isExclusion')::boolean = true
          AND (i.product_id IS NULL OR NOT d.products->'ids' @> to_jsonb(i.product_id::int))
        )

        -- Case 4: Category filter (inclusion) - discount applies to specific categories
        OR (
          d.product_categories IS NOT NULL
          AND d.product_categories->>'ids' IS NOT NULL
          AND (d.product_categories->>'isExclusion')::boolean = false
          AND i.category_id IS NOT NULL
          AND d.product_categories->'ids' @> to_jsonb(i.category_id::int)
        )

        -- Case 5: Category filter (exclusion) - discount applies to all EXCEPT these categories
        OR (
          d.product_categories IS NOT NULL
          AND d.product_categories->>'ids' IS NOT NULL
          AND (d.product_categories->>'isExclusion')::boolean = true
          AND (i.category_id IS NULL OR NOT d.product_categories->'ids' @> to_jsonb(i.category_id::int))
        )

        -- Case 6: Brand filter (inclusion) - discount applies to specific brands
        OR (
          d.brands IS NOT NULL
          AND d.brands->>'ids' IS NOT NULL
          AND (d.brands->>'isExclusion')::boolean = false
          AND i.brand_id IS NOT NULL
          AND d.brands->'ids' @> to_jsonb(i.brand_id::int)
        )

        -- Case 7: Brand filter (exclusion) - discount applies to all EXCEPT these brands
        OR (
          d.brands IS NOT NULL
          AND d.brands->>'ids' IS NOT NULL
          AND (d.brands->>'isExclusion')::boolean = true
          AND (i.brand_id IS NULL OR NOT d.brands->'ids' @> to_jsonb(i.brand_id::int))
        )
      )
    )
    WHERE i.quantity_available >= 5
  `;

  try {
    await pool.query(createViewSQL);
    console.log('Materialized view created!');
  } catch (err: any) {
    console.error('Error creating view:', err.message);
    await pool.end();
    return;
  }

  // Create indexes for fast lookups
  console.log('\nCreating indexes...');
  await pool.query('CREATE INDEX idx_product_discounts_store ON product_discounts (dutchie_store_id)');
  await pool.query('CREATE INDEX idx_product_discounts_category ON product_discounts (category)');
  await pool.query('CREATE INDEX idx_product_discounts_brand ON product_discounts (brand_name)');
  await pool.query('CREATE INDEX idx_product_discounts_discount ON product_discounts (discount_id)');
  console.log('Indexes created!');

  // Check results
  const count = await pool.query('SELECT COUNT(*) FROM product_discounts');
  console.log(`\nTotal rows in product_discounts: ${count.rows[0].count}`);

  const withDiscount = await pool.query('SELECT COUNT(*) FROM product_discounts WHERE discount_id IS NOT NULL');
  console.log(`Rows with discounts: ${withDiscount.rows[0].count}`);

  const withoutDiscount = await pool.query('SELECT COUNT(*) FROM product_discounts WHERE discount_id IS NULL');
  console.log(`Rows without discounts: ${withoutDiscount.rows[0].count}`);

  // Match type breakdown
  console.log('\n--- Match Type Breakdown ---');
  const matchTypes = await pool.query(`
    SELECT match_type, COUNT(*) as count
    FROM product_discounts
    WHERE discount_id IS NOT NULL
    GROUP BY match_type
    ORDER BY count DESC
  `);
  matchTypes.rows.forEach(r => {
    console.log(`  ${r.match_type}: ${r.count}`);
  });

  // Sample data
  console.log('\n--- Sample data (products with discounts) ---');
  const sample = await pool.query(`
    SELECT
      product_name,
      dutchie_store_id,
      unit_price,
      discount_name,
      discount_amount,
      discount_type,
      match_type
    FROM product_discounts
    WHERE discount_id IS NOT NULL
    LIMIT 5
  `);
  sample.rows.forEach(r => {
    console.log(`\n  ${r.product_name?.substring(0, 40)}`);
    console.log(`    Store: ${r.dutchie_store_id?.substring(0, 20)}...`);
    console.log(`    Price: $${r.unit_price}`);
    console.log(`    Discount: ${r.discount_name} (${r.discount_amount} ${r.discount_type})`);
    console.log(`    Match type: ${r.match_type}`);
  });

  await pool.end();
  console.log('\n\nDone! Query with: SELECT * FROM product_discounts WHERE dutchie_store_id = \'your-store-id\'');
}

createView();

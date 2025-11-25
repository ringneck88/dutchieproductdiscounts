/**
 * Direct discount sync - bypasses Strapi API, goes straight to PostgreSQL
 * This syncs discounts including all filter fields (products, categories, brands, etc.)
 */
import { Pool } from 'pg';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { randomBytes } from 'crypto';
dotenv.config();

function generateStrapiDocumentId(): string {
  return randomBytes(12).toString('hex');
}

async function syncDiscounts() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('=== DIRECT DISCOUNT SYNC ===\n');

  // Get all stores with API keys
  const storesResult = await pool.query(`
    SELECT id, name, dutchie_store_id, dutchie_api_key
    FROM stores
    WHERE dutchie_api_key IS NOT NULL AND dutchie_store_id IS NOT NULL
  `);

  console.log(`Found ${storesResult.rows.length} stores\n`);

  // Get actual column names from database
  const colResult = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'discounts'
    ORDER BY ordinal_position
  `);
  const dbColumns = new Set(colResult.rows.map(r => r.column_name));
  console.log(`Discounts table has ${dbColumns.size} columns\n`);

  // Define column mappings
  const allColumnMappings: { col: string; getValue: (d: any, storeInfo: any) => any }[] = [
    { col: 'document_id', getValue: () => generateStrapiDocumentId() },
    { col: 'discount_id', getValue: (d) => String(d.discountId) },
    { col: 'discount_name', getValue: (d) => d.discountName || null },
    { col: 'discount_code', getValue: (d) => d.discountCode || null },
    { col: 'discount_amount', getValue: (d) => d.discountAmount ?? null },
    { col: 'discount_type', getValue: (d) => d.discountType || null },
    { col: 'discount_method', getValue: (d) => d.discountMethod || null },
    { col: 'application_method', getValue: (d) => d.applicationMethod || null },
    { col: 'external_id', getValue: (d) => d.externalId || null },
    { col: 'is_active', getValue: (d) => d.isActive ?? true },
    { col: 'is_available_online', getValue: (d) => d.isAvailableOnline ?? true },
    { col: 'is_deleted', getValue: (d) => d.isDeleted ?? false },
    { col: 'require_manager_approval', getValue: (d) => d.requireManagerApproval ?? false },
    { col: 'valid_from', getValue: (d) => d.validFrom || null },
    { col: 'valid_until', getValue: (d) => d.validUntil || null },
    { col: 'threshold_type', getValue: (d) => d.thresholdType || null },
    { col: 'minimum_items_required', getValue: (d) => d.minimumItemsRequired ?? null },
    { col: 'maximum_items_allowed', getValue: (d) => d.maximumItemsAllowed ?? null },
    { col: 'maximum_usage_count', getValue: (d) => d.maximumUsageCount ?? null },
    { col: 'include_non_cannabis', getValue: (d) => d.includeNonCannabis ?? false },
    { col: 'first_time_customer_only', getValue: (d) => d.firstTimeCustomerOnly ?? false },
    { col: 'stack_on_other_discounts', getValue: (d) => d.stackOnOtherDiscounts ?? false },
    { col: 'applies_to_locations', getValue: (d, s) => JSON.stringify([{ locationName: s.storeName, dutchieStoreID: s.dutchieStoreID }]) },
    { col: 'weekly_recurrence_info', getValue: (d) => d.weeklyRecurrenceInfo ? JSON.stringify(d.weeklyRecurrenceInfo) : null },
    // Filter fields - these are the key fields for matching products to discounts
    { col: 'products', getValue: (d) => d.products ? JSON.stringify(d.products) : null },
    { col: 'product_categories', getValue: (d) => d.productCategories ? JSON.stringify(d.productCategories) : null },
    { col: 'brands', getValue: (d) => d.brands ? JSON.stringify(d.brands) : null },
    { col: 'vendors', getValue: (d) => d.vendors ? JSON.stringify(d.vendors) : null },
    { col: 'strains', getValue: (d) => d.strains ? JSON.stringify(d.strains) : null },
    { col: 'tiers', getValue: (d) => d.tiers ? JSON.stringify(d.tiers) : null },
    { col: 'tags', getValue: (d) => d.tags ? JSON.stringify(d.tags) : null },
    { col: 'inventory_tags', getValue: (d) => d.inventoryTags ? JSON.stringify(d.inventoryTags) : null },
    { col: 'customer_types', getValue: (d) => d.customerTypes ? JSON.stringify(d.customerTypes) : null },
    { col: 'discount_groups', getValue: (d) => d.discountGroups ? JSON.stringify(d.discountGroups) : null },
    { col: 'updated_at', getValue: () => new Date() },
    { col: 'published_at', getValue: () => new Date() },
    { col: 'created_at', getValue: () => new Date() },
    { col: 'created_by_id', getValue: () => 1 },
    { col: 'updated_by_id', getValue: () => 1 },
    { col: 'locale', getValue: () => 'en' },
  ];

  // Filter to only columns that exist
  const columnMappings = allColumnMappings.filter(m => dbColumns.has(m.col));
  console.log(`Using ${columnMappings.length} columns for INSERT\n`);

  let totalCreated = 0;
  let totalDeleted = 0;
  let totalErrors = 0;

  for (const store of storesResult.rows) {
    console.log(`\n--- Syncing: ${store.name} ---`);

    try {
      // Fetch discounts from Dutchie
      const basicAuthString = Buffer.from(`${store.dutchie_api_key}:`).toString('base64');
      const response = await axios.get('https://api.pos.dutchie.com/reporting/discounts', {
        headers: {
          'Authorization': `Basic ${basicAuthString}`,
          'Accept': 'text/plain',
          'Content-Type': 'application/json',
        },
      });

      const allDiscounts = Array.isArray(response.data) ? response.data : [];
      console.log(`  Fetched ${allDiscounts.length} total discounts from Dutchie`);

      // Filter active discounts
      const now = new Date();
      const activeDiscounts = allDiscounts.filter(discount => {
        if (discount.isActive === false) return false;
        if (discount.isDeleted === true) return false;
        if (discount.validUntil) {
          const validUntil = new Date(discount.validUntil);
          if (validUntil < now) return false;
        }
        return true;
      });

      console.log(`  ${activeDiscounts.length} active discounts (filtered ${allDiscounts.length - activeDiscounts.length} inactive/expired)`);

      // Count discounts with filter data
      const withFilters = activeDiscounts.filter(d =>
        d.products || d.productCategories || d.brands || d.vendors || d.strains
      );
      console.log(`  ${withFilters.length} discounts have product/category/brand filters`);

      const storeInfo = {
        storeName: store.name,
        dutchieStoreID: store.dutchie_store_id,
      };

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Delete existing discounts for this store
        const deleteResult = await client.query(`
          DELETE FROM discounts
          WHERE applies_to_locations @> $1::jsonb
        `, [JSON.stringify([{ dutchieStoreID: store.dutchie_store_id }])]);

        const deleted = deleteResult.rowCount || 0;
        totalDeleted += deleted;
        console.log(`  Deleted ${deleted} existing discounts`);

        if (activeDiscounts.length === 0) {
          await client.query('COMMIT');
          continue;
        }

        // Insert in batches
        const batchSize = 100;
        const columnNames = columnMappings.map(m => m.col).join(', ');

        for (let i = 0; i < activeDiscounts.length; i += batchSize) {
          const batch = activeDiscounts.slice(i, i + batchSize);

          const values: any[] = [];
          const valuePlaceholders: string[] = [];
          let paramIndex = 1;

          for (const discount of batch) {
            const row = columnMappings.map(m => m.getValue(discount, storeInfo));
            values.push(...row);
            const placeholders = row.map((_, idx) => `$${paramIndex + idx}`).join(', ');
            valuePlaceholders.push(`(${placeholders})`);
            paramIndex += row.length;
          }

          const insertQuery = `
            INSERT INTO discounts (${columnNames})
            VALUES ${valuePlaceholders.join(', ')}
          `;

          try {
            await client.query(insertQuery, values);
            totalCreated += batch.length;
          } catch (err: any) {
            console.error(`  Batch error:`, err.message);
            totalErrors += batch.length;
          }

          const progress = Math.min(i + batchSize, activeDiscounts.length);
          process.stdout.write(`  Inserted: ${progress}/${activeDiscounts.length}\r`);
        }

        await client.query('COMMIT');
        console.log(`  Completed: ${activeDiscounts.length} created                    `);

      } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`  Transaction error:`, error.message);
        totalErrors++;
      } finally {
        client.release();
      }

    } catch (error: any) {
      console.error(`  Error fetching from Dutchie:`, error.message);
      totalErrors++;
    }
  }

  console.log('\n=== SYNC COMPLETE ===');
  console.log(`Total created: ${totalCreated}`);
  console.log(`Total deleted: ${totalDeleted}`);
  console.log(`Total errors: ${totalErrors}`);

  // Verify filter data was populated
  console.log('\n=== VERIFYING FILTER DATA ===');
  const filterCols = ['products', 'product_categories', 'brands', 'vendors', 'strains'];
  for (const col of filterCols) {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM discounts WHERE ${col} IS NOT NULL
    `);
    console.log(`  ${col}: ${result.rows[0].count} non-null`);
  }

  await pool.end();
}

syncDiscounts().catch(console.error);

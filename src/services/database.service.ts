/**
 * Direct Database Service
 * Handles bulk operations directly on PostgreSQL for maximum speed
 */

import { Pool } from 'pg';
import { randomBytes } from 'crypto';
import config from '../config';

// Generate Strapi v5 style document_id (24 char alphanumeric)
function generateStrapiDocumentId(): string {
  return randomBytes(12).toString('hex');
}

class DatabaseService {
  private pool: Pool | null = null;

  async connect(): Promise<void> {
    if (!config.database.enabled) {
      throw new Error('Database not configured. Set DATABASE_URL environment variable.');
    }

    this.pool = new Pool({
      connectionString: config.database.url,
      ssl: config.database.url.includes('localhost') ? false : { rejectUnauthorized: false },
    });

    // Test connection
    const client = await this.pool.connect();
    client.release();
    console.log('Connected to PostgreSQL database');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Bulk sync inventory directly to PostgreSQL
   * Simple approach: DELETE ALL for store, then INSERT fresh
   */
  async bulkUpsertInventory(
    inventoryItems: any[],
    storeInfo: { dutchieStoreID: string; storeName: string }
  ): Promise<{ created: number; updated: number; deleted: number; errors: number }> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const stats = { created: 0, updated: 0, deleted: 0, errors: 0 };

    // Filter items with quantity >= 5
    const validItems = inventoryItems.filter(item => (item.quantityAvailable ?? 0) >= 5);
    console.log(`[${storeInfo.storeName}] Processing ${validItems.length} items (filtered ${inventoryItems.length - validItems.length} with qty < 5)...`);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Step 1: DELETE ALL inventory for this store
      // Note: Strapi uses snake_case column names in PostgreSQL
      const deleteResult = await client.query(`
        DELETE FROM inventories WHERE dutchie_store_id = $1
      `, [storeInfo.dutchieStoreID]);

      stats.deleted = deleteResult.rowCount || 0;
      console.log(`[${storeInfo.storeName}] Deleted ${stats.deleted} existing items`);

      if (validItems.length === 0) {
        await client.query('COMMIT');
        return stats;
      }

      // Step 2: INSERT all fresh items in batches
      const batchSize = 100;

      for (let i = 0; i < validItems.length; i += batchSize) {
        const batch = validItems.slice(i, i + batchSize);

        // Build bulk upsert query
        const values: any[] = [];
        const valuePlaceholders: string[] = [];
        let paramIndex = 1;

        for (const item of batch) {
          const row = [
            generateStrapiDocumentId(), // document_id - required for Strapi v5
            String(item.inventoryId),
            storeInfo.dutchieStoreID,
            item.productId ? String(item.productId) : null,
            item.sku || null,
            item.productName || null,
            item.description || null,
            item.categoryId ? String(item.categoryId) : null,
            item.category || null,
            item.imageUrl || null,
            item.quantityAvailable ?? 0,
            item.quantityUnits || null,
            item.allocatedQuantity ?? null,
            item.unitWeight ?? null,
            item.unitWeightUnit || null,
            item.unitCost ?? null,
            item.unitPrice ?? null,
            item.medUnitPrice ?? null,
            item.recUnitPrice ?? null,
            item.flowerEquivalent ?? null,
            item.recFlowerEquivalent ?? null,
            item.flowerEquivalentUnits || null,
            item.batchId ? String(item.batchId) : null,
            item.batchName || null,
            item.packageId || null,
            item.packageStatus || null,
            item.externalPackageId || null,
            item.packageNDC || null,
            item.strainId ? String(item.strainId) : null,
            item.strain || null,
            item.strainType || null,
            item.size || null,
            item.testedDate || null,
            item.sampleDate || null,
            item.packagedDate || null,
            item.manufacturingDate || null,
            item.lastModifiedDateUtc || null,
            item.expirationDate || null,
            item.labTestStatus || null,
            item.labResultUrl || null,
            item.vendorId ? String(item.vendorId) : null,
            item.vendor || null,
            item.pricingTierName || null,
            item.alternateName || null,
            item.brandId ? String(item.brandId) : null,
            item.brandName || null,
            item.medicalOnly ?? false,
            item.producer || null,
            item.producerId ? String(item.producerId) : null,
            item.potencyIndicator || null,
            item.masterCategory || null,
            item.effectivePotencyMg ?? null,
            item.isCannabis ?? true,
            new Date(), // updated_at
            new Date(), // published_at
            new Date(), // created_at
          ];

          values.push(...row);

          const placeholders = row.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          valuePlaceholders.push(`(${placeholders})`);
          paramIndex += row.length;
        }

        // Simple INSERT - Strapi uses snake_case column names
        const insertQuery = `
          INSERT INTO inventories (
            document_id, inventory_id, dutchie_store_id, product_id, sku, product_name,
            description, category_id, category, image_url, quantity_available,
            quantity_units, allocated_quantity, unit_weight, unit_weight_unit, unit_cost,
            unit_price, med_unit_price, rec_unit_price, flower_equivalent, rec_flower_equivalent,
            flower_equivalent_units, batch_id, batch_name, package_id, package_status,
            external_package_id, package_ndc, strain_id, strain, strain_type,
            size, tested_date, sample_date, packaged_date, manufacturing_date,
            last_modified_date_utc, expiration_date, lab_test_status, lab_result_url, vendor_id,
            vendor, pricing_tier_name, alternate_name, brand_id, brand_name,
            medical_only, producer, producer_id, potency_indicator, master_category,
            effective_potency_mg, is_cannabis, updated_at, published_at, created_at
          ) VALUES ${valuePlaceholders.join(', ')}
        `;

        try {
          await client.query(insertQuery, values);
          stats.created += batch.length;
        } catch (err: any) {
          console.error(`[${storeInfo.storeName}] Batch error:`, err.message);
          stats.errors += batch.length;
        }

        const progress = Math.min(i + batchSize, validItems.length);
        console.log(`[${storeInfo.storeName}] Inserted: ${progress}/${validItems.length}`);
      }

      await client.query('COMMIT');
      console.log(`[${storeInfo.storeName}] Complete: ${stats.created} inserted, ${stats.deleted} deleted`);

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error(`[${storeInfo.storeName}] Transaction error:`, error.message);
      throw error;
    } finally {
      client.release();
    }

    return stats;
  }

  /**
   * Debug: Get actual column names from a table
   */
  async getTableColumns(tableName: string): Promise<string[]> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const result = await this.pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    return result.rows.map(row => row.column_name);
  }

  /**
   * Bulk sync discounts directly to PostgreSQL
   * Dynamically builds INSERT based on columns that actually exist in the database
   */
  async bulkUpsertDiscounts(
    discounts: any[],
    storeInfo: { dutchieStoreID: string; storeName: string }
  ): Promise<{ created: number; updated: number; deleted: number; errors: number }> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const stats = { created: 0, updated: 0, deleted: 0, errors: 0 };

    // Filter active discounts
    const now = new Date();
    const activeDiscounts = discounts.filter(discount => {
      if (discount.isActive === false) return false;
      if (discount.isDeleted === true) return false;
      if (discount.validUntil) {
        const validUntil = new Date(discount.validUntil);
        if (validUntil < now) return false;
      }
      return true;
    });

    console.log(`[${storeInfo.storeName}] Processing ${activeDiscounts.length} discounts (filtered ${discounts.length - activeDiscounts.length} inactive/expired)...`);

    // Get actual column names from database
    const dbColumns = new Set(await this.getTableColumns('discounts'));
    console.log(`[${storeInfo.storeName}] Discount table columns:`, Array.from(dbColumns).join(', '));

    // Define all possible column mappings (db_column -> getter function)
    const allColumnMappings: { col: string; getValue: (d: any) => any }[] = [
      { col: 'document_id', getValue: () => generateStrapiDocumentId() }, // Required for Strapi v5
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
      { col: 'applies_to_locations', getValue: (d) => JSON.stringify([{ locationName: storeInfo.storeName, dutchieStoreID: storeInfo.dutchieStoreID }]) },
      { col: 'weekly_recurrence_info', getValue: (d) => d.weeklyRecurrenceInfo ? JSON.stringify(d.weeklyRecurrenceInfo) : null },
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
    ];

    // Filter to only columns that exist in the database
    const columnMappings = allColumnMappings.filter(m => dbColumns.has(m.col));
    console.log(`[${storeInfo.storeName}] Using ${columnMappings.length} columns for INSERT`);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Step 1: DELETE discounts for this store only (using JSONB containment)
      const deleteResult = await client.query(`
        DELETE FROM discounts
        WHERE applies_to_locations @> $1::jsonb
      `, [JSON.stringify([{ dutchieStoreID: storeInfo.dutchieStoreID }])]);

      stats.deleted = deleteResult.rowCount || 0;
      console.log(`[${storeInfo.storeName}] Deleted ${stats.deleted} existing discounts for this store`);

      if (activeDiscounts.length === 0) {
        await client.query('COMMIT');
        return stats;
      }

      // Step 2: INSERT all fresh discounts in batches
      const batchSize = 100;
      const columnNames = columnMappings.map(m => m.col).join(', ');

      for (let i = 0; i < activeDiscounts.length; i += batchSize) {
        const batch = activeDiscounts.slice(i, i + batchSize);

        const values: any[] = [];
        const valuePlaceholders: string[] = [];
        let paramIndex = 1;

        for (const discount of batch) {
          const row = columnMappings.map(m => m.getValue(discount));
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
          stats.created += batch.length;
        } catch (err: any) {
          console.error(`[${storeInfo.storeName}] Batch error:`, err.message);
          stats.errors += batch.length;
        }

        const progress = Math.min(i + batchSize, activeDiscounts.length);
        console.log(`[${storeInfo.storeName}] Inserted: ${progress}/${activeDiscounts.length}`);
      }

      await client.query('COMMIT');
      console.log(`[${storeInfo.storeName}] Complete: ${stats.created} inserted, ${stats.deleted} deleted`);

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error(`[${storeInfo.storeName}] Transaction error:`, error.message);
      throw error;
    } finally {
      client.release();
    }

    return stats;
  }
}

export default new DatabaseService();

/**
 * Direct Database Service
 * Handles bulk operations directly on PostgreSQL for maximum speed
 */

import { Pool } from 'pg';
import config from '../config';

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
          ];

          values.push(...row);

          const placeholders = row.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          valuePlaceholders.push(`(${placeholders})`);
          paramIndex += row.length;
        }

        // Simple INSERT - Strapi uses snake_case column names
        const insertQuery = `
          INSERT INTO inventories (
            inventory_id, dutchie_store_id, product_id, sku, product_name,
            description, category_id, category, image_url, quantity_available,
            quantity_units, allocated_quantity, unit_weight, unit_weight_unit, unit_cost,
            unit_price, med_unit_price, rec_unit_price, flower_equivalent, rec_flower_equivalent,
            flower_equivalent_units, batch_id, batch_name, package_id, package_status,
            external_package_id, package_ndc, strain_id, strain, strain_type,
            size, tested_date, sample_date, packaged_date, manufacturing_date,
            last_modified_date_utc, expiration_date, lab_test_status, lab_result_url, vendor_id,
            vendor, pricing_tier_name, alternate_name, brand_id, brand_name,
            medical_only, producer, producer_id, potency_indicator, master_category,
            effective_potency_mg, is_cannabis, updated_at
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
   * Simple approach: DELETE ALL discounts, then INSERT fresh
   * Note: The deployed Strapi schema may not have all columns - we only use columns that exist
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

    // Debug: Print actual column names
    const columns = await this.getTableColumns('discounts');
    console.log(`[${storeInfo.storeName}] Discount table columns:`, columns.join(', '));

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Step 1: DELETE ALL discounts
      const deleteResult = await client.query(`DELETE FROM discounts`);

      stats.deleted = deleteResult.rowCount || 0;
      console.log(`[${storeInfo.storeName}] Deleted ${stats.deleted} existing discounts`);

      if (activeDiscounts.length === 0) {
        await client.query('COMMIT');
        return stats;
      }

      // Step 2: INSERT all fresh discounts in batches
      // Using only columns that exist in the deployed schema
      const batchSize = 100;

      for (let i = 0; i < activeDiscounts.length; i += batchSize) {
        const batch = activeDiscounts.slice(i, i + batchSize);

        const values: any[] = [];
        const valuePlaceholders: string[] = [];
        let paramIndex = 1;

        for (const discount of batch) {
          const row = [
            String(discount.discountId),
            discount.discountName || null,
            discount.discountCode || null,
            discount.discountAmount ?? null,
            discount.discountType || null,
            discount.discountMethod || null,
            discount.applicationMethod || null,
            discount.externalId || null,
            discount.isActive ?? true,
            discount.isAvailableOnline ?? true,
            discount.isDeleted ?? false,
            discount.requireManagerApproval ?? false,
            discount.validFrom || null,
            discount.validUntil || null,
            discount.thresholdType || null,
            discount.minimumItemsRequired ?? null,
            discount.maximumItemsAllowed ?? null,
            discount.maximumUsageCount ?? null,
            discount.includeNonCannabis ?? false,
            discount.firstTimeCustomerOnly ?? false,
            discount.stackOnOtherDiscounts ?? false,
            discount.weeklyRecurrenceInfo ? JSON.stringify(discount.weeklyRecurrenceInfo) : null,
            discount.products ? JSON.stringify(discount.products) : null,
            discount.productCategories ? JSON.stringify(discount.productCategories) : null,
            discount.brands ? JSON.stringify(discount.brands) : null,
            discount.vendors ? JSON.stringify(discount.vendors) : null,
            discount.strains ? JSON.stringify(discount.strains) : null,
            discount.tiers ? JSON.stringify(discount.tiers) : null,
            discount.tags ? JSON.stringify(discount.tags) : null,
            discount.inventoryTags ? JSON.stringify(discount.inventoryTags) : null,
            discount.customerTypes ? JSON.stringify(discount.customerTypes) : null,
            discount.discountGroups ? JSON.stringify(discount.discountGroups) : null,
            new Date(), // updated_at
          ];

          values.push(...row);
          const placeholders = row.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          valuePlaceholders.push(`(${placeholders})`);
          paramIndex += row.length;
        }

        // Simple INSERT - using only columns that exist in the deployed Strapi schema
        // Note: applies_to_locations column removed as it may not exist in deployed DB
        const insertQuery = `
          INSERT INTO discounts (
            discount_id, discount_name, discount_code, discount_amount, discount_type,
            discount_method, application_method, external_id, is_active, is_available_online,
            is_deleted, require_manager_approval, valid_from, valid_until, threshold_type,
            minimum_items_required, maximum_items_allowed, maximum_usage_count, include_non_cannabis,
            first_time_customer_only, stack_on_other_discounts, weekly_recurrence_info,
            products, product_categories, brands, vendors, strains, tiers, tags,
            inventory_tags, customer_types, discount_groups, updated_at
          ) VALUES ${valuePlaceholders.join(', ')}
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

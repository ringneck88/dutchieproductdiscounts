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
      const deleteResult = await client.query(`
        DELETE FROM inventories WHERE "dutchieStoreID" = $1
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

        // Simple INSERT - no conflict handling needed since we deleted first
        const insertQuery = `
          INSERT INTO inventories (
            "inventoryId", "dutchieStoreID", "productId", "sku", "productName",
            "description", "categoryId", "category", "imageUrl", "quantityAvailable",
            "quantityUnits", "allocatedQuantity", "unitWeight", "unitWeightUnit", "unitCost",
            "unitPrice", "medUnitPrice", "recUnitPrice", "flowerEquivalent", "recFlowerEquivalent",
            "flowerEquivalentUnits", "batchId", "batchName", "packageId", "packageStatus",
            "externalPackageId", "packageNDC", "strainId", "strain", "strainType",
            "size", "testedDate", "sampleDate", "packagedDate", "manufacturingDate",
            "lastModifiedDateUtc", "expirationDate", "labTestStatus", "labResultUrl", "vendorId",
            "vendor", "pricingTierName", "alternateName", "brandId", "brandName",
            "medicalOnly", "producer", "producerId", "potencyIndicator", "masterCategory",
            "effectivePotencyMg", "isCannabis", "updated_at"
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
   * Bulk sync discounts directly to PostgreSQL
   * Simple approach: DELETE ALL for store, then INSERT fresh
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

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Step 1: DELETE ALL discounts that have this store in appliesToLocations
      // Using JSON containment operator to find discounts for this store
      const deleteResult = await client.query(`
        DELETE FROM discounts
        WHERE "appliesToLocations"::jsonb @> $1::jsonb
      `, [JSON.stringify([{ dutchieStoreID: storeInfo.dutchieStoreID }])]);

      stats.deleted = deleteResult.rowCount || 0;
      console.log(`[${storeInfo.storeName}] Deleted ${stats.deleted} existing discounts`);

      if (activeDiscounts.length === 0) {
        await client.query('COMMIT');
        return stats;
      }

      // Build appliesToLocations JSON for this store
      const appliesToLocations = JSON.stringify([{
        locationName: storeInfo.storeName,
        dutchieStoreID: storeInfo.dutchieStoreID,
      }]);

      // Step 2: INSERT all fresh discounts in batches
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
            appliesToLocations,
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

        // Simple INSERT - no conflict handling needed since we deleted first
        const insertQuery = `
          INSERT INTO discounts (
            "discountId", "discountName", "discountCode", "discountAmount", "discountType",
            "discountMethod", "applicationMethod", "externalId", "isActive", "isAvailableOnline",
            "isDeleted", "requireManagerApproval", "validFrom", "validUntil", "thresholdType",
            "minimumItemsRequired", "maximumItemsAllowed", "maximumUsageCount", "includeNonCannabis",
            "firstTimeCustomerOnly", "stackOnOtherDiscounts", "appliesToLocations", "weeklyRecurrenceInfo",
            "products", "productCategories", "brands", "vendors", "strains", "tiers", "tags",
            "inventoryTags", "customerTypes", "discountGroups", "updated_at"
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

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
   * Bulk upsert inventory items directly to PostgreSQL
   * Uses INSERT ... ON CONFLICT for atomic upserts
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

    if (validItems.length === 0) {
      return stats;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Step 1: Delete items for this store that aren't in the valid list
      const validInventoryIds = validItems.map(item => String(item.inventoryId));

      const deleteResult = await client.query(`
        DELETE FROM inventories
        WHERE "dutchieStoreID" = $1
        AND "inventoryId" IS NOT NULL
        AND "inventoryId" != ALL($2::text[])
      `, [storeInfo.dutchieStoreID, validInventoryIds]);

      stats.deleted = deleteResult.rowCount || 0;
      if (stats.deleted > 0) {
        console.log(`[${storeInfo.storeName}] Deleted ${stats.deleted} items`);
      }

      // Step 2: Bulk upsert in batches
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

        const upsertQuery = `
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
          ON CONFLICT ("inventoryId") DO UPDATE SET
            "dutchieStoreID" = EXCLUDED."dutchieStoreID",
            "productId" = EXCLUDED."productId",
            "sku" = EXCLUDED."sku",
            "productName" = EXCLUDED."productName",
            "description" = EXCLUDED."description",
            "categoryId" = EXCLUDED."categoryId",
            "category" = EXCLUDED."category",
            "imageUrl" = EXCLUDED."imageUrl",
            "quantityAvailable" = EXCLUDED."quantityAvailable",
            "quantityUnits" = EXCLUDED."quantityUnits",
            "allocatedQuantity" = EXCLUDED."allocatedQuantity",
            "unitWeight" = EXCLUDED."unitWeight",
            "unitWeightUnit" = EXCLUDED."unitWeightUnit",
            "unitCost" = EXCLUDED."unitCost",
            "unitPrice" = EXCLUDED."unitPrice",
            "medUnitPrice" = EXCLUDED."medUnitPrice",
            "recUnitPrice" = EXCLUDED."recUnitPrice",
            "flowerEquivalent" = EXCLUDED."flowerEquivalent",
            "recFlowerEquivalent" = EXCLUDED."recFlowerEquivalent",
            "flowerEquivalentUnits" = EXCLUDED."flowerEquivalentUnits",
            "batchId" = EXCLUDED."batchId",
            "batchName" = EXCLUDED."batchName",
            "packageId" = EXCLUDED."packageId",
            "packageStatus" = EXCLUDED."packageStatus",
            "externalPackageId" = EXCLUDED."externalPackageId",
            "packageNDC" = EXCLUDED."packageNDC",
            "strainId" = EXCLUDED."strainId",
            "strain" = EXCLUDED."strain",
            "strainType" = EXCLUDED."strainType",
            "size" = EXCLUDED."size",
            "testedDate" = EXCLUDED."testedDate",
            "sampleDate" = EXCLUDED."sampleDate",
            "packagedDate" = EXCLUDED."packagedDate",
            "manufacturingDate" = EXCLUDED."manufacturingDate",
            "lastModifiedDateUtc" = EXCLUDED."lastModifiedDateUtc",
            "expirationDate" = EXCLUDED."expirationDate",
            "labTestStatus" = EXCLUDED."labTestStatus",
            "labResultUrl" = EXCLUDED."labResultUrl",
            "vendorId" = EXCLUDED."vendorId",
            "vendor" = EXCLUDED."vendor",
            "pricingTierName" = EXCLUDED."pricingTierName",
            "alternateName" = EXCLUDED."alternateName",
            "brandId" = EXCLUDED."brandId",
            "brandName" = EXCLUDED."brandName",
            "medicalOnly" = EXCLUDED."medicalOnly",
            "producer" = EXCLUDED."producer",
            "producerId" = EXCLUDED."producerId",
            "potencyIndicator" = EXCLUDED."potencyIndicator",
            "masterCategory" = EXCLUDED."masterCategory",
            "effectivePotencyMg" = EXCLUDED."effectivePotencyMg",
            "isCannabis" = EXCLUDED."isCannabis",
            "updated_at" = EXCLUDED."updated_at"
        `;

        try {
          await client.query(upsertQuery, values);
          stats.updated += batch.length;
        } catch (err: any) {
          console.error(`[${storeInfo.storeName}] Batch error:`, err.message);
          stats.errors += batch.length;
        }

        const progress = Math.min(i + batchSize, validItems.length);
        console.log(`[${storeInfo.storeName}] Progress: ${progress}/${validItems.length}`);
      }

      await client.query('COMMIT');
      console.log(`[${storeInfo.storeName}] Complete: ${stats.updated} upserted, ${stats.deleted} deleted`);

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
   * Bulk upsert discounts directly to PostgreSQL
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

    if (activeDiscounts.length === 0) {
      return stats;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Build appliesToLocations JSON for this store
      const appliesToLocations = JSON.stringify([{
        locationName: storeInfo.storeName,
        dutchieStoreID: storeInfo.dutchieStoreID,
      }]);

      // Bulk upsert in batches
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

        const upsertQuery = `
          INSERT INTO discounts (
            "discountId", "discountName", "discountCode", "discountAmount", "discountType",
            "discountMethod", "applicationMethod", "externalId", "isActive", "isAvailableOnline",
            "isDeleted", "requireManagerApproval", "validFrom", "validUntil", "thresholdType",
            "minimumItemsRequired", "maximumItemsAllowed", "maximumUsageCount", "includeNonCannabis",
            "firstTimeCustomerOnly", "stackOnOtherDiscounts", "appliesToLocations", "weeklyRecurrenceInfo",
            "products", "productCategories", "brands", "vendors", "strains", "tiers", "tags",
            "inventoryTags", "customerTypes", "discountGroups", "updated_at"
          ) VALUES ${valuePlaceholders.join(', ')}
          ON CONFLICT ("discountId") DO UPDATE SET
            "discountName" = EXCLUDED."discountName",
            "discountCode" = EXCLUDED."discountCode",
            "discountAmount" = EXCLUDED."discountAmount",
            "discountType" = EXCLUDED."discountType",
            "discountMethod" = EXCLUDED."discountMethod",
            "applicationMethod" = EXCLUDED."applicationMethod",
            "externalId" = EXCLUDED."externalId",
            "isActive" = EXCLUDED."isActive",
            "isAvailableOnline" = EXCLUDED."isAvailableOnline",
            "isDeleted" = EXCLUDED."isDeleted",
            "requireManagerApproval" = EXCLUDED."requireManagerApproval",
            "validFrom" = EXCLUDED."validFrom",
            "validUntil" = EXCLUDED."validUntil",
            "thresholdType" = EXCLUDED."thresholdType",
            "minimumItemsRequired" = EXCLUDED."minimumItemsRequired",
            "maximumItemsAllowed" = EXCLUDED."maximumItemsAllowed",
            "maximumUsageCount" = EXCLUDED."maximumUsageCount",
            "includeNonCannabis" = EXCLUDED."includeNonCannabis",
            "firstTimeCustomerOnly" = EXCLUDED."firstTimeCustomerOnly",
            "stackOnOtherDiscounts" = EXCLUDED."stackOnOtherDiscounts",
            "appliesToLocations" = EXCLUDED."appliesToLocations",
            "weeklyRecurrenceInfo" = EXCLUDED."weeklyRecurrenceInfo",
            "products" = EXCLUDED."products",
            "productCategories" = EXCLUDED."productCategories",
            "brands" = EXCLUDED."brands",
            "vendors" = EXCLUDED."vendors",
            "strains" = EXCLUDED."strains",
            "tiers" = EXCLUDED."tiers",
            "tags" = EXCLUDED."tags",
            "inventoryTags" = EXCLUDED."inventoryTags",
            "customerTypes" = EXCLUDED."customerTypes",
            "discountGroups" = EXCLUDED."discountGroups",
            "updated_at" = EXCLUDED."updated_at"
        `;

        try {
          await client.query(upsertQuery, values);
          stats.updated += batch.length;
        } catch (err: any) {
          console.error(`[${storeInfo.storeName}] Batch error:`, err.message);
          stats.errors += batch.length;
        }

        const progress = Math.min(i + batchSize, activeDiscounts.length);
        console.log(`[${storeInfo.storeName}] Progress: ${progress}/${activeDiscounts.length}`);
      }

      await client.query('COMMIT');
      console.log(`[${storeInfo.storeName}] Complete: ${stats.updated} upserted`);

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

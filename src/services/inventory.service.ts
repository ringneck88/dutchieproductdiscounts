/**
 * Inventory Service
 * Handles syncing inventory from Dutchie to Strapi
 */

import axios, { AxiosInstance } from 'axios';
import config from '../config';

interface StrapiInventory {
  id?: number;
  inventoryId: number;
  productId?: number;
  sku?: string;
  productName: string;
  description?: string;
  categoryId?: number;
  category?: string;
  imageUrl?: string;
  quantityAvailable?: number;
  quantityUnits?: string;
  allocatedQuantity?: number;
  unitWeight?: number;
  unitWeightUnit?: string;
  unitCost?: number;
  unitPrice?: number;
  medUnitPrice?: number;
  recUnitPrice?: number;
  flowerEquivalent?: number;
  recFlowerEquivalent?: number;
  flowerEquivalentUnits?: string;
  batchId?: number;
  batchName?: string;
  packageId?: string;
  packageStatus?: string;
  externalPackageId?: string;
  packageNDC?: string;
  strainId?: number;
  strain?: string;
  strainType?: string;
  size?: string;
  labResults?: any;
  testedDate?: string;
  sampleDate?: string;
  packagedDate?: string;
  manufacturingDate?: string;
  lastModifiedDateUtc?: string;
  expirationDate?: string;
  labTestStatus?: string;
  labResultUrl?: string;
  vendorId?: number;
  vendor?: string;
  roomQuantities?: any;
  pricingTierName?: string;
  alternateName?: string;
  tags?: any;
  brandId?: number;
  brandName?: string;
  medicalOnly?: boolean;
  producer?: string;
  producerId?: number;
  lineage?: any;
  potencyIndicator?: string;
  masterCategory?: string;
  effectivePotencyMg?: number;
  isCannabis?: boolean;
  storeId?: number;
  storeName?: string;
  DutchieStoreID?: string;
}

class InventoryService {
  private client: AxiosInstance;
  private readonly COLLECTION_NAME = 'inventories';
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000; // 1 second

  constructor() {
    this.client = axios.create({
      baseURL: config.strapi.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.strapi.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Retry helper with exponential backoff for transient network errors
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries = this.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      // Check if error is retryable (DNS, network, timeout, 5xx)
      const isRetryable =
        error.code === 'EAI_AGAIN' || // DNS temporary failure
        error.code === 'ENOTFOUND' || // DNS not found
        error.code === 'ETIMEDOUT' || // Connection timeout
        error.code === 'ECONNRESET' || // Connection reset
        error.code === 'ECONNREFUSED' || // Connection refused
        (error.response?.status >= 500 && error.response?.status < 600); // Server errors

      if (!isRetryable || retries <= 0) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = this.BASE_DELAY * Math.pow(2, this.MAX_RETRIES - retries) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      return this.retryWithBackoff(operation, retries - 1);
    }
  }

  /**
   * Create or update an inventory item in Strapi
   * Uses inventoryId as unique identifier
   * Note: Logging removed to prevent Railway rate limiting
   */
  async upsertInventory(inventoryData: any, storeInfo: { storeId: number; storeName: string; DutchieStoreID: string }): Promise<void> {
    try {
      // Check if inventory item already exists
      const existingInventory = await this.findInventoryByDutchieId(inventoryData.inventoryId);

      const mappedData: StrapiInventory = {
        inventoryId: inventoryData.inventoryId,
        productId: inventoryData.productId,
        sku: inventoryData.sku,
        productName: inventoryData.productName,
        description: inventoryData.description,
        categoryId: inventoryData.categoryId,
        category: inventoryData.category,
        imageUrl: inventoryData.imageUrl,
        quantityAvailable: inventoryData.quantityAvailable,
        quantityUnits: inventoryData.quantityUnits,
        allocatedQuantity: inventoryData.allocatedQuantity,
        unitWeight: inventoryData.unitWeight,
        unitWeightUnit: inventoryData.unitWeightUnit,
        unitCost: inventoryData.unitCost,
        unitPrice: inventoryData.unitPrice,
        medUnitPrice: inventoryData.medUnitPrice,
        recUnitPrice: inventoryData.recUnitPrice,
        flowerEquivalent: inventoryData.flowerEquivalent,
        recFlowerEquivalent: inventoryData.recFlowerEquivalent,
        flowerEquivalentUnits: inventoryData.flowerEquivalentUnits,
        batchId: inventoryData.batchId,
        batchName: inventoryData.batchName,
        packageId: inventoryData.packageId,
        packageStatus: inventoryData.packageStatus,
        externalPackageId: inventoryData.externalPackageId,
        packageNDC: inventoryData.packageNDC,
        strainId: inventoryData.strainId,
        strain: inventoryData.strain,
        strainType: inventoryData.strainType,
        size: inventoryData.size,
        labResults: inventoryData.labResults,
        testedDate: inventoryData.testedDate,
        sampleDate: inventoryData.sampleDate,
        packagedDate: inventoryData.packagedDate,
        manufacturingDate: inventoryData.manufacturingDate,
        lastModifiedDateUtc: inventoryData.lastModifiedDateUtc,
        expirationDate: inventoryData.expirationDate,
        labTestStatus: inventoryData.labTestStatus,
        labResultUrl: inventoryData.labResultUrl,
        vendorId: inventoryData.vendorId,
        vendor: inventoryData.vendor,
        roomQuantities: inventoryData.roomQuantities,
        pricingTierName: inventoryData.pricingTierName,
        alternateName: inventoryData.alternateName,
        tags: inventoryData.tags,
        brandId: inventoryData.brandId,
        brandName: inventoryData.brandName,
        medicalOnly: inventoryData.medicalOnly ?? false,
        producer: inventoryData.producer,
        producerId: inventoryData.producerId,
        lineage: inventoryData.lineage,
        potencyIndicator: inventoryData.potencyIndicator,
        masterCategory: inventoryData.masterCategory,
        effectivePotencyMg: inventoryData.effectivePotencyMg,
        isCannabis: inventoryData.isCannabis ?? true,
        storeId: storeInfo.storeId,
        storeName: storeInfo.storeName,
        DutchieStoreID: storeInfo.DutchieStoreID,
      };

      if (existingInventory) {
        // Try to update existing inventory item
        try {
          await this.retryWithBackoff(() =>
            this.client.put(
              `/api/${this.COLLECTION_NAME}/${existingInventory.id}`,
              { data: mappedData }
            )
          );
        } catch (updateError: any) {
          // If record was deleted (404), create a new one
          if (updateError.response?.status === 404) {
            await this.retryWithBackoff(() =>
              this.client.post(
                `/api/${this.COLLECTION_NAME}`,
                { data: mappedData }
              )
            );
          } else {
            throw updateError;
          }
        }
      } else {
        // Create new inventory item
        try {
          await this.retryWithBackoff(() =>
            this.client.post(
              `/api/${this.COLLECTION_NAME}`,
              { data: mappedData }
            )
          );
        } catch (createError: any) {
          // If unique constraint violation (inventory already exists), find and update it
          if (createError.response?.status === 400 &&
              createError.response?.data?.error?.message?.includes('unique')) {

            // Race condition: Wait a moment for database to sync, then retry finding it
            await new Promise(resolve => setTimeout(resolve, 100));

            const existing = await this.findInventoryByDutchieId(inventoryData.inventoryId);
            if (existing) {
              try {
                await this.retryWithBackoff(() =>
                  this.client.put(
                    `/api/${this.COLLECTION_NAME}/${existing.id}`,
                    { data: mappedData }
                  )
                );
              } catch (updateError: any) {
                // If update also fails, skip silently unless it's a real error
                if (updateError.response?.status !== 404) {
                  console.error(`Error updating inventory ${inventoryData.inventoryId} after unique constraint:`, updateError.response?.data || updateError.message);
                }
              }
            }
            // If we still can't find it, skip silently - another process created it
          } else {
            throw createError;
          }
        }
      }
    } catch (error: any) {
      // Only log and re-throw non-unique-constraint errors
      if (!(error.response?.status === 400 &&
            error.response?.data?.error?.message?.includes('unique'))) {
        console.error(`Error upserting inventory ${inventoryData.inventoryId}:`, error.response?.data || error.message);
        throw error;
      }
      // Silently skip unique constraint errors - inventory was created by parallel process
    }
  }

  /**
   * Find an inventory item in Strapi by Dutchie inventory ID
   */
  private async findInventoryByDutchieId(inventoryId: number): Promise<StrapiInventory | null> {
    try {
      const response = await this.retryWithBackoff(() =>
        this.client.get(`/api/${this.COLLECTION_NAME}`, {
          params: {
            filters: {
              inventoryId: { $eq: inventoryId }
            },
            pagination: { pageSize: 1 }
          }
        })
      );

      const inventories = response.data.data;
      if (inventories && inventories.length > 0) {
        return {
          id: inventories[0].id,
          ...inventories[0].attributes || inventories[0]
        };
      }

      return null;
    } catch (error) {
      console.error(`Error finding inventory ${inventoryId}:`, error);
      return null;
    }
  }

  /**
   * Delete inventory items that are no longer in Dutchie
   */
  async deleteInactiveInventory(activeInventoryIds: number[]): Promise<number> {
    try {
      // Get all inventory items from Strapi
      const response = await this.client.get(`/api/${this.COLLECTION_NAME}`, {
        params: {
          pagination: { pageSize: 10000 }
        }
      });

      const strapiInventories = response.data.data;
      let deletedCount = 0;

      for (const inventory of strapiInventories) {
        const inventoryData = inventory.attributes || inventory;
        const inventoryId = inventoryData.inventoryId;

        if (!activeInventoryIds.includes(inventoryId)) {
          await this.client.delete(`/api/${this.COLLECTION_NAME}/${inventory.id}`);
          console.log(`   ✓ Deleted inactive inventory: ${inventoryData.productName} (ID: ${inventoryId})`);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error deleting inactive inventory:', error);
      return 0;
    }
  }
}

export default InventoryService;

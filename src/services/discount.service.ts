/**
 * Discount Service
 * Handles syncing discounts from Dutchie to Strapi
 */

import axios, { AxiosInstance } from 'axios';
import config from '../config';

interface StrapiDiscount {
  id?: number;
  discountId: string;
  discountName: string;
  discountCode?: string;
  discountAmount?: number;
  discountType?: string;
  discountMethod?: string;
  applicationMethod?: string;
  externalId?: string;
  isActive?: boolean;
  isAvailableOnline?: boolean;
  isDeleted?: boolean;
  requireManagerApproval?: boolean;
  validFrom?: string;
  validUntil?: string;
  thresholdType?: string;
  minimumItemsRequired?: number;
  maximumItemsAllowed?: number;
  maximumUsageCount?: number;
  includeNonCannabis?: boolean;
  firstTimeCustomerOnly?: boolean;
  stackOnOtherDiscounts?: boolean;
  appliesToLocations?: any;
  weeklyRecurrenceInfo?: any;
  products?: any;
  productCategories?: any;
  brands?: any;
  vendors?: any;
  strains?: any;
  tiers?: any;
  tags?: any;
  inventoryTags?: any;
  customerTypes?: any;
  discountGroups?: any;
}

class DiscountService {
  private client: AxiosInstance;
  private readonly COLLECTION_NAME = 'discounts';
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
   * Helper function to map appliesToLocations with locationName and dutchieStoreID
   */
  private mapAppliesToLocations(
    originalData: any,
    storeInfo: { storeId: number; storeName: string; dutchieStoreID: string }
  ): any[] {
    // If originalData exists and is an array, map it to include both fields
    if (Array.isArray(originalData)) {
      return originalData.map((location: any) => ({
        locationName: location.locationName || storeInfo.storeName,
        dutchieStoreID: location.dutchieStoreID || storeInfo.dutchieStoreID,
      }));
    }

    // If originalData is a string (single location ID), create a single-item array
    if (typeof originalData === 'string') {
      return [{
        locationName: storeInfo.storeName,
        dutchieStoreID: originalData,
      }];
    }

    // If originalData is an object, convert it
    if (originalData && typeof originalData === 'object') {
      return [{
        locationName: originalData.locationName || storeInfo.storeName,
        dutchieStoreID: originalData.dutchieStoreID || storeInfo.dutchieStoreID,
      }];
    }

    // Default: return current store info
    return [{
      locationName: storeInfo.storeName,
      dutchieStoreID: storeInfo.dutchieStoreID,
    }];
  }

  /**
   * Create or update a discount in Strapi
   * Uses discountId as unique identifier
   * Note: Logging removed to prevent Railway rate limiting
   */
  async upsertDiscount(discountData: any, storeInfo: { storeId: number; storeName: string; dutchieStoreID: string }): Promise<void> {
    try {
      // Check if discount already exists
      const existingDiscount = await this.findDiscountByDutchieId(discountData.discountId);

      const mappedData: StrapiDiscount = {
        discountId: String(discountData.discountId),
        discountName: discountData.discountName,
        discountCode: discountData.discountCode,
        discountAmount: discountData.discountAmount,
        discountType: discountData.discountType,
        discountMethod: discountData.discountMethod,
        applicationMethod: discountData.applicationMethod,
        externalId: discountData.externalId,
        isActive: discountData.isActive ?? true,
        isAvailableOnline: discountData.isAvailableOnline ?? true,
        isDeleted: discountData.isDeleted ?? false,
        requireManagerApproval: discountData.requireManagerApproval ?? false,
        validFrom: discountData.validFrom,
        validUntil: discountData.validUntil,
        thresholdType: discountData.thresholdType,
        minimumItemsRequired: discountData.minimumItemsRequired,
        maximumItemsAllowed: discountData.maximumItemsAllowed,
        maximumUsageCount: discountData.maximumUsageCount,
        includeNonCannabis: discountData.includeNonCannabis ?? false,
        firstTimeCustomerOnly: discountData.firstTimeCustomerOnly ?? false,
        stackOnOtherDiscounts: discountData.stackOnOtherDiscounts ?? false,
        appliesToLocations: this.mapAppliesToLocations(discountData.appliesToLocations, storeInfo),
        weeklyRecurrenceInfo: discountData.weeklyRecurrenceInfo,
        products: discountData.products,
        productCategories: discountData.productCategories,
        brands: discountData.brands,
        vendors: discountData.vendors,
        strains: discountData.strains,
        tiers: discountData.tiers,
        tags: discountData.tags,
        inventoryTags: discountData.inventoryTags,
        customerTypes: discountData.customerTypes,
        discountGroups: discountData.discountGroups,
        // Note: Store fields removed - Strapi discounts schema doesn't have these
      };

      if (existingDiscount) {
        // Try to update existing discount
        try {
          await this.retryWithBackoff(() =>
            this.client.put(
              `/api/${this.COLLECTION_NAME}/${existingDiscount.id}`,
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
        // Create new discount
        try {
          await this.retryWithBackoff(() =>
            this.client.post(
              `/api/${this.COLLECTION_NAME}`,
              { data: mappedData }
            )
          );
        } catch (createError: any) {
          // If unique constraint violation (discount already exists), find and update it
          if (createError.response?.status === 400 &&
              createError.response?.data?.error?.message?.includes('unique')) {

            // Race condition: Another process created this discount between our check and create attempt
            // Wait a moment for database to sync, then retry finding it
            await new Promise(resolve => setTimeout(resolve, 100));

            const existing = await this.findDiscountByDutchieId(discountData.discountId);
            if (existing) {
              try {
                await this.retryWithBackoff(() =>
                  this.client.put(
                    `/api/${this.COLLECTION_NAME}/${existing.id}`,
                    { data: mappedData }
                  )
                );
              } catch (updateError: any) {
                // If update also fails, another process is handling this discount - skip silently
                if (updateError.response?.status !== 404) {
                  // Log non-404 errors for debugging
                  console.error(`Error updating discount ${discountData.discountId} after unique constraint:`, updateError.response?.data || updateError.message);
                }
              }
            }
            // If we still can't find it, another process must have created it - skip silently
            // Don't throw error since the discount exists in Strapi (created by parallel process)
          } else {
            throw createError;
          }
        }
      }
    } catch (error: any) {
      // Only log and re-throw non-unique-constraint errors
      // Unique constraint errors are handled above and shouldn't reach here
      if (!(error.response?.status === 400 &&
            error.response?.data?.error?.message?.includes('unique'))) {
        console.error(`Error upserting discount ${discountData.discountId}:`, error.response?.data || error.message);
        throw error;
      }
      // Silently skip unique constraint errors - discount was created by parallel process
    }
  }

  /**
   * Find a discount in Strapi by Dutchie discount ID
   */
  private async findDiscountByDutchieId(discountId: number | string): Promise<StrapiDiscount | null> {
    try {
      const response = await this.retryWithBackoff(() =>
        this.client.get(`/api/${this.COLLECTION_NAME}`, {
          params: {
            filters: {
              discountId: { $eq: String(discountId) }
            },
            pagination: { pageSize: 1 }
          }
        })
      );

      const discounts = response.data.data;
      if (discounts && discounts.length > 0) {
        return {
          id: discounts[0].id,
          ...discounts[0].attributes || discounts[0]
        };
      }

      return null;
    } catch (error) {
      console.error(`Error finding discount ${discountId}:`, error);
      return null;
    }
  }

  /**
   * Delete discounts that are no longer active in Dutchie
   */
  async deleteInactiveDiscounts(activeDiscountIds: number[]): Promise<number> {
    try {
      // Get all discounts from Strapi
      const response = await this.client.get(`/api/${this.COLLECTION_NAME}`, {
        params: {
          pagination: { pageSize: 1000 }
        }
      });

      const strapiDiscounts = response.data.data;
      let deletedCount = 0;

      for (const discount of strapiDiscounts) {
        const discountData = discount.attributes || discount;
        const discountId = discountData.discountId;

        if (!activeDiscountIds.includes(discountId)) {
          await this.client.delete(`/api/${this.COLLECTION_NAME}/${discount.id}`);
          console.log(`   ✓ Deleted inactive discount: ${discountData.discountName} (ID: ${discountId})`);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error deleting inactive discounts:', error);
      return 0;
    }
  }

  /**
   * Bulk replace all discounts for a store
   * Much faster than individual upserts - deletes all then bulk creates
   */
  async bulkReplaceDiscounts(
    discounts: any[],
    storeInfo: { storeId: number; storeName: string; dutchieStoreID: string }
  ): Promise<{ created: number; deleted: number; errors: number }> {
    const stats = { created: 0, deleted: 0, errors: 0 };

    try {
      // Step 1: Find all existing discounts for this store by checking appliesToLocations
      console.log(`[${storeInfo.storeName}] Finding existing discounts...`);
      let page = 1;
      let hasMore = true;
      const idsToDelete: number[] = [];

      while (hasMore) {
        const response = await this.retryWithBackoff(() =>
          this.client.get(`/api/${this.COLLECTION_NAME}`, {
            params: {
              pagination: { page, pageSize: 100 },
              fields: ['id', 'appliesToLocations']
            }
          })
        );

        const items = response.data.data;

        // Filter to only discounts that belong to this store
        for (const item of items) {
          const attrs = item.attributes || item;
          const locations = attrs.appliesToLocations;
          if (Array.isArray(locations)) {
            const belongsToStore = locations.some(
              (loc: any) => loc.dutchieStoreID === storeInfo.dutchieStoreID
            );
            if (belongsToStore) {
              idsToDelete.push(item.id);
            }
          }
        }

        hasMore = items.length === 100;
        page++;
      }

      // Delete in parallel batches
      if (idsToDelete.length > 0) {
        const deleteBatchSize = 50; // Smaller batches to avoid overwhelming Strapi
        let deletedSoFar = 0;
        for (let i = 0; i < idsToDelete.length; i += deleteBatchSize) {
          const batch = idsToDelete.slice(i, i + deleteBatchSize);
          await Promise.all(
            batch.map(id =>
              this.retryWithBackoff(() =>
                this.client.delete(`/api/${this.COLLECTION_NAME}/${id}`)
              ).catch(() => {})
            )
          );
          deletedSoFar += batch.length;
          console.log(`[${storeInfo.storeName}] Deleting discounts... ${deletedSoFar}/${idsToDelete.length}`);
        }
        stats.deleted = idsToDelete.length;
      }

      // Step 2: Filter active discounts only
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

      console.log(`[${storeInfo.storeName}] Creating ${activeDiscounts.length} discounts (filtered ${discounts.length - activeDiscounts.length} inactive/expired)...`);

      // Step 3: Create in parallel batches
      const createBatchSize = 50; // Smaller batches to avoid overwhelming Strapi

      for (let i = 0; i < activeDiscounts.length; i += createBatchSize) {
        const batch = activeDiscounts.slice(i, i + createBatchSize);

        const results = await Promise.all(
          batch.map(async (discount) => {
            try {
              const mappedData = this.mapDiscountData(discount, storeInfo);
              await this.retryWithBackoff(() =>
                this.client.post(`/api/${this.COLLECTION_NAME}`, { data: mappedData })
              );
              return true;
            } catch (error: any) {
              // Log first error to help debug
              if (stats.errors === 0) {
                console.error(`[${storeInfo.storeName}] First error:`, error.response?.data || error.message);
              }
              return false;
            }
          })
        );

        stats.created += results.filter(r => r).length;
        stats.errors += results.filter(r => !r).length;
        console.log(`[${storeInfo.storeName}] Creating discounts... ${stats.created}/${activeDiscounts.length}${stats.errors > 0 ? ` (${stats.errors} errors)` : ''}`);
      }

    } catch (error) {
      console.error(`[${storeInfo.storeName}] Bulk replace discounts error:`, error);
      throw error;
    }

    return stats;
  }

  /**
   * Map discount data to Strapi format
   */
  private mapDiscountData(
    discountData: any,
    storeInfo: { storeId: number; storeName: string; dutchieStoreID: string }
  ): StrapiDiscount {
    return {
      discountId: String(discountData.discountId),
      discountName: discountData.discountName,
      discountCode: discountData.discountCode,
      discountAmount: discountData.discountAmount,
      discountType: discountData.discountType,
      discountMethod: discountData.discountMethod,
      applicationMethod: discountData.applicationMethod,
      externalId: discountData.externalId,
      isActive: discountData.isActive ?? true,
      isAvailableOnline: discountData.isAvailableOnline ?? true,
      isDeleted: discountData.isDeleted ?? false,
      requireManagerApproval: discountData.requireManagerApproval ?? false,
      validFrom: discountData.validFrom,
      validUntil: discountData.validUntil,
      thresholdType: discountData.thresholdType,
      minimumItemsRequired: discountData.minimumItemsRequired,
      maximumItemsAllowed: discountData.maximumItemsAllowed,
      maximumUsageCount: discountData.maximumUsageCount,
      includeNonCannabis: discountData.includeNonCannabis ?? false,
      firstTimeCustomerOnly: discountData.firstTimeCustomerOnly ?? false,
      stackOnOtherDiscounts: discountData.stackOnOtherDiscounts ?? false,
      appliesToLocations: this.mapAppliesToLocations(discountData.appliesToLocations, storeInfo),
      weeklyRecurrenceInfo: discountData.weeklyRecurrenceInfo,
      products: discountData.products,
      productCategories: discountData.productCategories,
      brands: discountData.brands,
      vendors: discountData.vendors,
      strains: discountData.strains,
      tiers: discountData.tiers,
      tags: discountData.tags,
      inventoryTags: discountData.inventoryTags,
      customerTypes: discountData.customerTypes,
      discountGroups: discountData.discountGroups,
    };
  }
}

export default DiscountService;

/**
 * Discount Service
 * Handles syncing discounts from Dutchie to Strapi
 */

import axios, { AxiosInstance } from 'axios';
import config from '../config';

interface StrapiDiscount {
  id?: number;
  discountId: number;
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
  stores?: any;
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
   * Create or update a discount in Strapi
   * Uses discountId as unique identifier
   * Note: Logging removed to prevent Railway rate limiting
   */
  async upsertDiscount(discountData: any, storeInfo: { storeId: number; storeName: string; DutchieStoreID: string }): Promise<void> {
    try {
      // Check if discount already exists
      const existingDiscount = await this.findDiscountByDutchieId(discountData.discountId);

      // Build stores array - merge with existing stores if discount already exists
      let stores = [storeInfo];
      if (existingDiscount && existingDiscount.stores && Array.isArray(existingDiscount.stores)) {
        // Check if this store is already in the array
        const storeExists = existingDiscount.stores.some(
          (s: any) => s.DutchieStoreID === storeInfo.DutchieStoreID
        );
        if (!storeExists) {
          stores = [...existingDiscount.stores, storeInfo];
        } else {
          // Update existing store info
          stores = existingDiscount.stores.map((s: any) =>
            s.DutchieStoreID === storeInfo.DutchieStoreID ? storeInfo : s
          );
        }
      }

      const mappedData: StrapiDiscount = {
        discountId: discountData.discountId,
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
        appliesToLocations: discountData.appliesToLocations,
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
        stores: stores,
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
  private async findDiscountByDutchieId(discountId: number): Promise<StrapiDiscount | null> {
    try {
      const response = await this.retryWithBackoff(() =>
        this.client.get(`/api/${this.COLLECTION_NAME}`, {
          params: {
            filters: {
              discountId: { $eq: discountId }
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
}

export default DiscountService;

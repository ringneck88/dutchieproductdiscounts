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
}

class DiscountService {
  private client: AxiosInstance;
  private readonly COLLECTION_NAME = 'discounts';

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
   * Create or update a discount in Strapi
   * Uses discountId as unique identifier
   */
  async upsertDiscount(discountData: any): Promise<void> {
    try {
      // Check if discount already exists
      const existingDiscount = await this.findDiscountByDutchieId(discountData.discountId);

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
      };

      if (existingDiscount) {
        // Try to update existing discount
        try {
          await this.client.put(
            `/api/${this.COLLECTION_NAME}/${existingDiscount.id}`,
            { data: mappedData }
          );
          console.log(`   ✓ Updated discount: ${discountData.discountName} (ID: ${discountData.discountId})`);
        } catch (updateError: any) {
          // If record was deleted (404), create a new one
          if (updateError.response?.status === 404) {
            console.log(`   Discount ${existingDiscount.id} not found, creating new record`);
            await this.client.post(
              `/api/${this.COLLECTION_NAME}`,
              { data: mappedData }
            );
            console.log(`   ✓ Created discount (after 404): ${discountData.discountName} (ID: ${discountData.discountId})`);
          } else {
            throw updateError;
          }
        }
      } else {
        // Create new discount
        await this.client.post(
          `/api/${this.COLLECTION_NAME}`,
          { data: mappedData }
        );
        console.log(`   ✓ Created discount: ${discountData.discountName} (ID: ${discountData.discountId})`);
      }
    } catch (error: any) {
      console.error(`Error upserting discount ${discountData.discountId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Find a discount in Strapi by Dutchie discount ID
   */
  private async findDiscountByDutchieId(discountId: number): Promise<StrapiDiscount | null> {
    try {
      const response = await this.client.get(`/api/${this.COLLECTION_NAME}`, {
        params: {
          filters: {
            discountId: { $eq: discountId }
          },
          pagination: { pageSize: 1 }
        }
      });

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

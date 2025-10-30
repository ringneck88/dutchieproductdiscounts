/**
 * Strapi API Service
 * Handles all interactions with the Strapi API for ProductDiscount collection
 */

import axios, { AxiosInstance } from 'axios';
import config from '../config';
import {
  ProductDiscount,
  StrapiProductDiscount,
  StrapiCollectionResponse,
  StrapiSingleResponse,
} from '../types';

class StrapiService {
  private client: AxiosInstance;
  private readonly COLLECTION_NAME = 'product-discounts';

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
   * Get all product discounts from Strapi
   */
  async getAllProductDiscounts(): Promise<StrapiProductDiscount[]> {
    try {
      const response = await this.client.get<StrapiCollectionResponse<StrapiProductDiscount>>(
        `/api/${this.COLLECTION_NAME}`,
        {
          params: {
            pagination: {
              pageSize: 100,
            },
          },
        }
      );

      return response.data.data.map((item) => ({
        id: item.id,
        ...item.attributes,
      }));
    } catch (error) {
      console.error('Error fetching product discounts from Strapi:', error);
      throw new Error(`Failed to fetch product discounts: ${error}`);
    }
  }

  /**
   * Find product discounts by product and discount Dutchie IDs
   */
  async findProductDiscount(
    productDutchieId: string,
    discountDutchieId: string
  ): Promise<StrapiProductDiscount | null> {
    try {
      const response = await this.client.get<StrapiCollectionResponse<StrapiProductDiscount>>(
        `/api/${this.COLLECTION_NAME}`,
        {
          params: {
            filters: {
              productDutchieId: {
                $eq: productDutchieId,
              },
              discountDutchieId: {
                $eq: discountDutchieId,
              },
            },
          },
        }
      );

      if (response.data.data.length > 0) {
        const item = response.data.data[0];
        return {
          id: item.id,
          ...item.attributes,
        };
      }

      return null;
    } catch (error) {
      console.error('Error finding product discount:', error);
      return null;
    }
  }

  /**
   * Create a new product discount entry in Strapi
   */
  async createProductDiscount(data: ProductDiscount): Promise<StrapiProductDiscount> {
    try {
      const response = await this.client.post<StrapiSingleResponse<StrapiProductDiscount>>(
        `/api/${this.COLLECTION_NAME}`,
        { data }
      );

      return {
        id: response.data.data.id,
        ...response.data.data.attributes,
      };
    } catch (error) {
      console.error('Error creating product discount:', error);
      throw new Error(`Failed to create product discount: ${error}`);
    }
  }

  /**
   * Update an existing product discount entry in Strapi
   */
  async updateProductDiscount(
    id: number,
    data: Partial<ProductDiscount>
  ): Promise<StrapiProductDiscount> {
    try {
      const response = await this.client.put<StrapiSingleResponse<StrapiProductDiscount>>(
        `/api/${this.COLLECTION_NAME}/${id}`,
        { data }
      );

      return {
        id: response.data.data.id,
        ...response.data.data.attributes,
      };
    } catch (error) {
      console.error(`Error updating product discount ${id}:`, error);
      throw new Error(`Failed to update product discount: ${error}`);
    }
  }

  /**
   * Delete a product discount entry from Strapi
   */
  async deleteProductDiscount(id: number): Promise<void> {
    try {
      await this.client.delete(`/api/${this.COLLECTION_NAME}/${id}`);
      console.log(`Deleted product discount ${id}`);
    } catch (error) {
      console.error(`Error deleting product discount ${id}:`, error);
      throw new Error(`Failed to delete product discount: ${error}`);
    }
  }

  /**
   * Delete all product discounts with specific product or discount Dutchie ID
   * Useful for cleanup when a product or discount is removed from Dutchie
   */
  async deleteByDutchieId(type: 'product' | 'discount', dutchieId: string): Promise<number> {
    try {
      const field = type === 'product' ? 'productDutchieId' : 'discountDutchieId';

      const response = await this.client.get<StrapiCollectionResponse<StrapiProductDiscount>>(
        `/api/${this.COLLECTION_NAME}`,
        {
          params: {
            filters: {
              [field]: {
                $eq: dutchieId,
              },
            },
          },
        }
      );

      const items = response.data.data;
      let deletedCount = 0;

      for (const item of items) {
        await this.deleteProductDiscount(item.id);
        deletedCount++;
      }

      console.log(`Deleted ${deletedCount} entries for ${type} ${dutchieId}`);
      return deletedCount;
    } catch (error) {
      console.error(`Error deleting by ${type} ID:`, error);
      throw new Error(`Failed to delete by ${type} ID: ${error}`);
    }
  }

  /**
   * Clean up expired or inactive discounts
   */
  async cleanupInactiveDiscounts(): Promise<number> {
    try {
      const now = new Date().toISOString();

      // Find discounts that are either inactive or have ended
      const response = await this.client.get<StrapiCollectionResponse<StrapiProductDiscount>>(
        `/api/${this.COLLECTION_NAME}`,
        {
          params: {
            filters: {
              $or: [
                {
                  discountIsActive: {
                    $eq: false,
                  },
                },
                {
                  discountEndTimestamp: {
                    $lt: now,
                  },
                },
              ],
            },
          },
        }
      );

      const items = response.data.data;
      let deletedCount = 0;

      for (const item of items) {
        await this.deleteProductDiscount(item.id);
        deletedCount++;
      }

      console.log(`Cleaned up ${deletedCount} inactive/expired discounts`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up inactive discounts:', error);
      throw new Error(`Failed to cleanup inactive discounts: ${error}`);
    }
  }
}

export default new StrapiService();

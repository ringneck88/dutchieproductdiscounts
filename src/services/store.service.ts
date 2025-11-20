/**
 * Store Service
 * Handles fetching store information from Strapi
 */

import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { Store, StrapiStore, StrapiCollectionResponse } from '../types';

class StoreService {
  private client: AxiosInstance;
  private readonly COLLECTION_NAME = 'stores';

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
   * Get all active stores from Strapi
   */
  async getActiveStores(): Promise<Store[]> {
    try {
      console.log('Fetching active stores from Strapi...');

      // Fetch all stores without filters (Strapi filter syntax may vary by version)
      const response = await this.client.get<StrapiCollectionResponse<StrapiStore>>(
        `/api/${this.COLLECTION_NAME}`,
        {
          params: {
            pagination: {
              pageSize: 100,
            },
          },
        }
      );

      // Map stores - handle both Strapi v4 (attributes) and v5 (flat) structure
      const allStores = response.data.data.map((item) => ({
        id: item.id,
        ...(item.attributes || item), // Use attributes if present, otherwise use item directly
      }));

      // Filter for active stores in code
      const stores = allStores.filter((store) => store.isActive === true || store.isActive === undefined);

      console.log(`Found ${stores.length} active stores (out of ${allStores.length} total)`);
      return stores;
    } catch (error) {
      console.error('Error fetching stores from Strapi:', error);
      throw new Error(`Failed to fetch stores: ${error}`);
    }
  }

  /**
   * Get all stores (including inactive)
   */
  async getAllStores(): Promise<Store[]> {
    try {
      const response = await this.client.get<StrapiCollectionResponse<StrapiStore>>(
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
        ...(item.attributes || item),
      }));
    } catch (error) {
      console.error('Error fetching all stores from Strapi:', error);
      throw new Error(`Failed to fetch all stores: ${error}`);
    }
  }

  /**
   * Get a specific store by ID
   */
  async getStoreById(storeId: number): Promise<Store | null> {
    try {
      const response = await this.client.get(`/api/${this.COLLECTION_NAME}/${storeId}`);

      const item = response.data.data;
      return {
        id: item.id,
        ...(item.attributes || item),
      } as Store;
    } catch (error) {
      console.error(`Error fetching store ${storeId}:`, error);
      return null;
    }
  }

  /**
   * Validate that a store has required Dutchie credentials
   */
  validateStore(store: Store): boolean {
    if (!store.dutchieApiKey) {
      console.warn(`Store "${store.name}" is missing dutchieApiKey`);
      return false;
    }

    if (!store.DutchieStoreID) {
      console.warn(`Store "${store.name}" is missing DutchieStoreID`);
      return false;
    }

    return true;
  }

  /**
   * Get all stores with valid Dutchie credentials
   */
  async getValidStores(): Promise<Store[]> {
    const stores = await this.getActiveStores();
    return stores.filter((store) => this.validateStore(store));
  }

  /**
   * Update store information from Dutchie retailer data
   */
  async updateStoreFromDutchie(
    storeId: number,
    retailerInfo: any
  ): Promise<Store | null> {
    try {
      const updateData: Partial<Store> = {};

      // Map Dutchie retailer fields to store fields
      if (retailerInfo.name) {
        updateData.name = retailerInfo.name;
      }

      if (retailerInfo.location || retailerInfo.address) {
        updateData.location = retailerInfo.location || retailerInfo.address;
      }

      if (retailerInfo.city) {
        updateData.city = retailerInfo.city;
      }

      if (retailerInfo.state) {
        updateData.state = retailerInfo.state;
      }

      if (retailerInfo.timezone) {
        updateData.timezone = retailerInfo.timezone;
      }

      // Only update if there's data to update
      if (Object.keys(updateData).length === 0) {
        console.log(`No retailer info to update for store ${storeId}`);
        return null;
      }

      const response = await this.client.put(
        `/api/${this.COLLECTION_NAME}/${storeId}`,
        { data: updateData }
      );

      console.log(`✓ Updated store ${storeId} with Dutchie retailer info`);

      const item = response.data.data;
      return {
        id: item.id,
        ...(item.attributes || item),
      } as Store;
    } catch (error) {
      console.error(`Error updating store ${storeId} from Dutchie:`, error);
      return null;
    }
  }
}

export default new StoreService();

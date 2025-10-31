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

      const response = await this.client.get<StrapiCollectionResponse<StrapiStore>>(
        `/api/${this.COLLECTION_NAME}`,
        {
          params: {
            filters: {
              isActive: {
                $eq: true,
              },
            },
            pagination: {
              pageSize: 100,
            },
          },
        }
      );

      const stores = response.data.data.map((item) => ({
        id: item.id,
        ...item.attributes,
      }));

      console.log(`Found ${stores.length} active stores`);
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
        ...item.attributes,
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
      const response = await this.client.get<{
        data: {
          id: number;
          attributes: StrapiStore;
        };
      }>(`/api/${this.COLLECTION_NAME}/${storeId}`);

      return {
        id: response.data.data.id,
        ...response.data.data.attributes,
      };
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
}

export default new StoreService();

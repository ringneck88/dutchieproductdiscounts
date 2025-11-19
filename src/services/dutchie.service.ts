/**
 * Dutchie API Service
 * Handles all interactions with the Dutchie API
 * Now supports multiple stores with different API keys
 */

import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { DutchieProduct, DutchieDiscount, DutchieApiResponse } from '../types';

interface DutchieCredentials {
  apiKey: string;
  retailerId: string;
}

class DutchieService {
  private client: AxiosInstance;
  private retailerId: string;

  constructor(credentials: DutchieCredentials) {
    this.retailerId = credentials.retailerId;

    // Dutchie API uses Basic Auth with format: "apikey:"
    const basicAuthString = Buffer.from(`${credentials.apiKey}:`).toString('base64');

    this.client = axios.create({
      baseURL: config.dutchie.apiUrl,
      headers: {
        'Authorization': `Basic ${basicAuthString}`,
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetch all products from Dutchie API
   * Endpoint: GET /products
   * Query params: fromLastModifiedDateUTC (to limit data), isActive=true
   */
  async getProducts(): Promise<DutchieProduct[]> {
    try {
      // Calculate the lookback date based on configuration
      const lookbackHours = config.dutchie.productLookbackHours;
      const fromDate = new Date();
      fromDate.setHours(fromDate.getHours() - lookbackHours);
      const fromDateUTC = fromDate.toISOString();

      console.log(`Fetching products from Dutchie API for retailer ${this.retailerId}...`);
      console.log(`  Looking back ${lookbackHours} hours (from ${fromDateUTC})`);

      const response = await this.client.get<DutchieProduct[]>(
        '/products',
        {
          params: {
            fromLastModifiedDateUTC: fromDateUTC,
            isActive: true,
          },
        }
      );

      // Dutchie API returns array directly
      const products = Array.isArray(response.data) ? response.data : [];
      console.log(`Fetched ${products.length} active products from Dutchie`);

      return products;
    } catch (error) {
      console.error('Error fetching products from Dutchie:', error);
      throw new Error(`Failed to fetch products: ${error}`);
    }
  }

  /**
   * Fetch all discounts from Dutchie API
   * Endpoint: GET /discounts
   * Query params: includeInactive=false, includeInclusionExclusionData=true
   */
  async getDiscounts(): Promise<DutchieDiscount[]> {
    try {
      console.log(`Fetching discounts from Dutchie API for retailer ${this.retailerId}...`);

      const response = await this.client.get<DutchieDiscount[]>(
        '/discounts',
        {
          params: {
            includeInactive: false,
            includeInclusionExclusionData: true,
          },
        }
      );

      // Dutchie API returns array directly
      const discounts = Array.isArray(response.data) ? response.data : [];
      console.log(`Fetched ${discounts.length} discounts from Dutchie`);

      return discounts;
    } catch (error) {
      console.error('Error fetching discounts from Dutchie:', error);
      throw new Error(`Failed to fetch discounts: ${error}`);
    }
  }

  /**
   * Fetch a specific product by ID
   */
  async getProductById(productId: number): Promise<DutchieProduct | null> {
    try {
      const response = await this.client.get<DutchieProduct>(
        `/products/${productId}`,
        {
          params: {
            isActive: true,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Fetch a specific discount by ID
   */
  async getDiscountById(discountId: number): Promise<DutchieDiscount | null> {
    try {
      const response = await this.client.get<DutchieDiscount>(
        `/discounts/${discountId}`,
        {
          params: {
            includeInactive: false,
            includeInclusionExclusionData: true,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error fetching discount ${discountId}:`, error);
      return null;
    }
  }

  /**
   * Fetch all discounts from Dutchie Reporting API
   * Endpoint: GET /reporting/discounts
   * This endpoint provides comprehensive discount data including all fields
   */
  async getReportingDiscounts(): Promise<any[]> {
    try {
      console.log(`Fetching discounts from Dutchie Reporting API for retailer ${this.retailerId}...`);

      const response = await this.client.get<any[]>('/reporting/discounts');

      // Dutchie API returns array directly
      const discounts = Array.isArray(response.data) ? response.data : [];
      console.log(`Fetched ${discounts.length} discounts from Dutchie Reporting API`);

      return discounts;
    } catch (error) {
      console.error('Error fetching discounts from Dutchie Reporting API:', error);
      throw new Error(`Failed to fetch reporting discounts: ${error}`);
    }
  }

  /**
   * Fetch all inventory from Dutchie Reporting API
   * Endpoint: GET /reporting/inventory
   * This endpoint provides comprehensive inventory data including all fields and room quantities
   */
  async getReportingInventory(): Promise<any[]> {
    try {
      console.log(`Fetching inventory from Dutchie Reporting API for retailer ${this.retailerId}...`);

      const response = await this.client.get<any[]>('/reporting/inventory', {
        params: {
          includeRoomQuantities: true
        }
      });

      // Dutchie API returns array directly
      const inventory = Array.isArray(response.data) ? response.data : [];
      console.log(`Fetched ${inventory.length} inventory items from Dutchie Reporting API`);

      return inventory;
    } catch (error) {
      console.error('Error fetching inventory from Dutchie Reporting API:', error);
      throw new Error(`Failed to fetch reporting inventory: ${error}`);
    }
  }

  /**
   * Get all products that have active discounts
   * Returns products with their associated discount IDs
   */
  async getProductsWithDiscounts(): Promise<Map<DutchieProduct, string[]>> {
    const products = await this.getProducts();
    const discounts = await this.getDiscounts();

    const productDiscountMap = new Map<DutchieProduct, string[]>();

    // Build a map of products to their discount IDs
    for (const product of products) {
      const productDiscountIds: string[] = [];

      // Check if product has discounts directly attached
      if (product.discounts && Array.isArray(product.discounts)) {
        productDiscountIds.push(...product.discounts);
      }

      // Check if any discounts apply to this product
      for (const discount of discounts) {
        if (discount.applicableProducts &&
            Array.isArray(discount.applicableProducts) &&
            discount.applicableProducts.includes(product.id)) {
          if (!productDiscountIds.includes(discount.id)) {
            productDiscountIds.push(discount.id);
          }
        }
      }

      if (productDiscountIds.length > 0) {
        productDiscountMap.set(product, productDiscountIds);
      }
    }

    console.log(`Found ${productDiscountMap.size} products with discounts`);
    return productDiscountMap;
  }
}

export default DutchieService;

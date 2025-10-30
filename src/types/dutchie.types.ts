/**
 * Dutchie API Types
 * These interfaces represent the structure of data from Dutchie API
 */

export interface DutchieProduct {
  id: string;
  name: string;
  description?: string;
  image?: string;
  brand?: string;
  brandId?: string;
  category?: string;
  prices?: {
    total: number;
    discounted?: number;
  };
  discounts?: string[]; // Array of discount IDs
  [key: string]: any; // Allow for additional fields
}

export interface DutchieDiscount {
  id: string;
  name: string;
  description?: string;
  image?: string;
  brand?: string;
  startTime: string | number; // ISO string or timestamp
  endTime: string | number; // ISO string or timestamp
  isActive: boolean;
  discountType?: string;
  value?: number;
  applicableProducts?: string[]; // Array of product IDs this discount applies to
  [key: string]: any; // Allow for additional fields
}

export interface DutchieApiResponse<T> {
  data: T;
  errors?: any[];
}

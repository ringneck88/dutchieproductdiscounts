/**
 * Strapi API Types
 * These interfaces represent the structure of data stored in Strapi
 */

export interface Store {
  id?: number;
  name: string;
  dutchieApiKey: string;
  DutchieStoreID: string; // Changed to match Strapi field name
  location?: string;
  isActive?: boolean;
  city?: string;
  state?: string;
  storeCode?: string;
  timezone?: string;
}

export interface StrapiStore extends Store {
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface ProductDiscount {
  productName: string;
  productDutchieId: string;
  productDescription?: string;
  productImageUrl?: string;
  productBrand?: string;
  discountName: string;
  discountBrand?: string;
  discountImageUrl?: string;
  discountStartTimestamp: string | Date;
  discountEndTimestamp: string | Date;
  discountIsActive: boolean;
  discountDutchieId: string;
  storeId: string;
  storeName?: string;
  storeLocation?: string;
}

export interface StrapiProductDiscount extends ProductDiscount {
  id?: number;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiSingleResponse<T> {
  data: {
    id: number;
    attributes: T;
  };
}

export interface StrapiCollectionResponse<T> {
  data: Array<{
    id: number;
    attributes: T;
  }>;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

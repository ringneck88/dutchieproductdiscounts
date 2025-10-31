/**
 * Dutchie API Types
 * These interfaces represent the actual structure of data from Dutchie API
 */

export interface DutchieProduct {
  productId: number;
  productName: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  brandId?: number;
  brandName?: string;
  category?: string;
  masterCategory?: string;
  categoryId?: number;
  price?: number;
  medPrice?: number;
  recPrice?: number;
  strain?: string;
  strainType?: string;
  strainId?: number;
  isActive: boolean;
  isCannabis?: boolean;
  lastModifiedDateUTC?: string;
  createdDate?: string;
  vendorId?: number;
  vendorName?: string;
  sku?: string;
  tags?: string[] | null;
  allowAutomaticDiscounts?: boolean;
  [key: string]: any; // Allow for additional fields
}

export interface DutchieDiscount {
  discountId: number;
  discountName: string;
  discountAmount?: number;
  discountCode?: string | null;
  discountType?: string;
  discountMethod?: string;
  isActive: boolean;
  validFrom: string; // ISO string
  validUntil: string; // ISO string
  minimumItemsRequired?: number | null;
  maximumItemsAllowed?: number | null;
  maximumUsageCount?: number | null;
  stackOnOtherDiscounts?: boolean;
  firstTimeCustomerOnly?: boolean;
  includeNonCannabis?: boolean;
  // Filter objects - determine which products this discount applies to
  // Each filter has { ids: [...], isExclusion: bool } structure
  products?: { ids: number[]; isExclusion: boolean } | null;
  productCategories?: { ids: number[]; isExclusion: boolean } | null;
  brands?: { ids: number[]; isExclusion: boolean } | null;
  vendors?: { ids: number[]; isExclusion: boolean } | null;
  strains?: { ids: number[]; isExclusion: boolean } | null;
  tags?: { ids: string[]; isExclusion: boolean } | null;
  inventoryTags?: { ids: string[]; isExclusion: boolean } | null;
  tiers?: { ids: any[]; isExclusion: boolean } | null;
  customerTypes?: any[] | null;
  discountGroups?: any[];
  [key: string]: any; // Allow for additional fields
}

export interface DutchieApiResponse<T> {
  data?: T;
  errors?: any[];
}

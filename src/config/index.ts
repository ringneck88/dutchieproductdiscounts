/**
 * Configuration management
 * Loads and validates environment variables
 */

import dotenv from 'dotenv';

dotenv.config();

interface Config {
  dutchie: {
    apiUrl: string;
    productLookbackHours: number; // How many hours back to fetch products
  };
  strapi: {
    apiUrl: string;
    apiToken: string;
  };
  database: {
    url: string;
    enabled: boolean;
  };
  redis: {
    url: string;
    enabled: boolean;
  };
  sync: {
    intervalMinutes?: number;
  };
}

const config: Config = {
  dutchie: {
    // API keys and retailer IDs now come from Strapi store collection
    apiUrl: process.env.DUTCHIE_API_URL || 'https://api.pos.dutchie.com',
    // Default to 2160 hours (90 days) for product lookback to capture recent modifications
    productLookbackHours: process.env.DUTCHIE_PRODUCT_LOOKBACK_HOURS
      ? parseInt(process.env.DUTCHIE_PRODUCT_LOOKBACK_HOURS, 10)
      : 2160,
  },
  strapi: {
    apiUrl: process.env.STRAPI_API_URL || 'http://localhost:1337',
    apiToken: process.env.STRAPI_API_TOKEN || '',
  },
  database: {
    url: process.env.DATABASE_URL || '',
    enabled: !!process.env.DATABASE_URL, // Enabled if DATABASE_URL is set
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    enabled: process.env.REDIS_ENABLED !== 'false', // Enabled by default
  },
  sync: {
    intervalMinutes: process.env.SYNC_INTERVAL
      ? parseInt(process.env.SYNC_INTERVAL, 10)
      : undefined,
  },
};

// Validate required configuration
export function validateConfig(): void {
  const errors: string[] = [];

  // Only Strapi API token is required now
  // Dutchie API keys come from the store collection in Strapi
  if (!config.strapi.apiToken) {
    errors.push('STRAPI_API_TOKEN is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

export default config;

/**
 * Fast API Server
 * Serves product-discount data from Redis cache
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import redisService from './services/redis.service';
import config from './config';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(compression()); // Enable gzip compression
app.use(express.json());

/**
 * Helper function to get the top N best discounts
 * Sorts by discount value (percentage or dollar amount)
 */
function getBestDiscounts(product: any, limit: number = 6): any {
  if (!product.discounts || product.discounts.length === 0) {
    return product;
  }

  // Sort discounts by value (percentage first, then dollar amount)
  const sortedDiscounts = [...product.discounts].sort((a, b) => {
    // Calculate discount values for comparison
    const aValue = parseFloat(a.discountName?.match(/(\d+)%/)?.[1] || '0');
    const bValue = parseFloat(b.discountName?.match(/(\d+)%/)?.[1] || '0');

    if (aValue !== bValue) {
      return bValue - aValue; // Higher percentage first
    }

    // If percentages are equal, compare dollar amounts
    const aDollar = parseFloat(a.discountName?.match(/\$(\d+\.?\d*)/)?.[1] || '0');
    const bDollar = parseFloat(b.discountName?.match(/\$(\d+\.?\d*)/)?.[1] || '0');

    return bDollar - aDollar; // Higher dollar amount first
  });

  return {
    ...product,
    discounts: sortedDiscounts.slice(0, limit),
    totalDiscounts: product.discounts.length,
    showingTop: Math.min(limit, product.discounts.length),
  };
}

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    redis: redisService.isReady() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get cache statistics
 */
app.get('/api/cache/stats', async (req: Request, res: Response) => {
  try {
    if (!redisService.isReady()) {
      return res.status(503).json({ error: 'Redis not connected' });
    }

    const stats = await redisService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

/**
 * Get all products with discounts (all stores)
 * GET /api/products/discounts
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 100, max: 500)
 *   - maxDiscounts: Max discounts per product (default: 6)
 *   - productsPerStore: Products per store (default: 6)
 */
app.get('/api/products/discounts', async (req: Request, res: Response) => {
  try {
    if (!redisService.isReady()) {
      return res.status(503).json({ error: 'Redis cache not available' });
    }

    // Parse pagination params
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 100));
    const maxDiscounts = Math.max(1, parseInt(req.query.maxDiscounts as string) || 6);
    const productsPerStore = Math.max(1, parseInt(req.query.productsPerStore as string) || 6);

    const allProducts = await redisService.getAllProductsWithDiscounts();

    // Group products by store
    const productsByStore = new Map<string, any[]>();
    for (const product of allProducts) {
      const storeId = product.storeId || 'unknown';
      if (!productsByStore.has(storeId)) {
        productsByStore.set(storeId, []);
      }
      productsByStore.get(storeId)!.push(product);
    }

    // Take N products from each store and combine
    const balancedProducts: any[] = [];
    productsByStore.forEach((products, storeId) => {
      // Take first N products from this store
      const storeProducts = products.slice(0, productsPerStore);
      balancedProducts.push(...storeProducts);
    });

    // Filter to best N discounts per product
    const productsWithBestDiscounts = balancedProducts.map(product =>
      getBestDiscounts(product, maxDiscounts)
    );

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = productsWithBestDiscounts.slice(startIndex, endIndex);

    // Set cache headers (cache for 5 minutes)
    res.set('Cache-Control', 'public, max-age=300');
    res.set('ETag', `"${Date.now()}"`);

    res.json({
      page,
      limit,
      total: balancedProducts.length,
      totalPages: Math.ceil(balancedProducts.length / limit),
      count: paginatedProducts.length,
      storesCount: productsByStore.size,
      productsPerStore,
      data: paginatedProducts,
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * Get products with discounts for a specific store
 * GET /api/stores/:storeId/products/discounts
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 *   - maxDiscounts: Max discounts per product (default: 6)
 */
app.get('/api/stores/:storeId/products/discounts', async (req: Request, res: Response) => {
  try {
    if (!redisService.isReady()) {
      return res.status(503).json({ error: 'Redis cache not available' });
    }

    const { storeId } = req.params;

    // Parse pagination params
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const maxDiscounts = Math.max(1, parseInt(req.query.maxDiscounts as string) || 6);

    const allProducts = await redisService.getStoreProductsWithDiscounts(storeId);

    // Filter to best N discounts per product
    const productsWithBestDiscounts = allProducts.map(product =>
      getBestDiscounts(product, maxDiscounts)
    );

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = productsWithBestDiscounts.slice(startIndex, endIndex);

    // Set cache headers (cache for 5 minutes)
    res.set('Cache-Control', 'public, max-age=300');
    res.set('ETag', `"${Date.now()}"`);

    res.json({
      storeId,
      page,
      limit,
      total: allProducts.length,
      totalPages: Math.ceil(allProducts.length / limit),
      count: paginatedProducts.length,
      data: paginatedProducts,
    });
  } catch (error) {
    console.error('Error getting store products:', error);
    res.status(500).json({ error: 'Failed to fetch store products' });
  }
});

/**
 * Get a specific product with discounts
 * GET /api/stores/:storeId/products/:productId
 * Query params:
 *   - maxDiscounts: Max discounts to return (default: 6)
 */
app.get('/api/stores/:storeId/products/:productId', async (req: Request, res: Response) => {
  try {
    if (!redisService.isReady()) {
      return res.status(503).json({ error: 'Redis cache not available' });
    }

    const { storeId, productId } = req.params;
    const maxDiscounts = Math.max(1, parseInt(req.query.maxDiscounts as string) || 6);

    const product = await redisService.getProductDiscounts(storeId, parseInt(productId));

    if (!product) {
      return res.status(404).json({ error: 'Product not found or has no discounts' });
    }

    // Filter to best N discounts
    const productWithBestDiscounts = getBestDiscounts(product, maxDiscounts);

    // Set cache headers (cache for 5 minutes)
    res.set('Cache-Control', 'public, max-age=300');
    res.set('ETag', `"${Date.now()}"`);

    res.json(productWithBestDiscounts);
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * Clear cache for a specific store
 * DELETE /api/stores/:storeId/cache
 */
app.delete('/api/stores/:storeId/cache', async (req: Request, res: Response) => {
  try {
    if (!redisService.isReady()) {
      return res.status(503).json({ error: 'Redis cache not available' });
    }

    const { storeId } = req.params;
    const cleared = await redisService.clearStoreCache(storeId);

    res.json({
      message: `Cleared ${cleared} cached products for store ${storeId}`,
      count: cleared,
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * Start the API server
 */
async function start() {
  try {
    // Connect to Redis
    if (!config.redis.enabled) {
      console.error('Redis is disabled in configuration. Enable it to use the API.');
      process.exit(1);
    }

    await redisService.connect(config.redis.url);
    console.log('✓ Connected to Redis');

    // Start Express server
    // Listen on 0.0.0.0 to accept connections from Railway's network
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 Fast API Server running on http://0.0.0.0:${PORT}`);
      console.log(`${'='.repeat(60)}`);
      console.log('\nAvailable endpoints:');
      console.log(`  GET  /health`);
      console.log(`  GET  /api/cache/stats`);
      console.log(`  GET  /api/products/discounts`);
      console.log(`  GET  /api/stores/:storeId/products/discounts`);
      console.log(`  GET  /api/stores/:storeId/products/:productId`);
      console.log(`  DEL  /api/stores/:storeId/cache`);
      console.log(`\n${'='.repeat(60)}\n`);
    });
  } catch (error) {
    console.error('Failed to start API server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await redisService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await redisService.disconnect();
  process.exit(0);
});

// Start if run directly
if (require.main === module) {
  start();
}

export default app;

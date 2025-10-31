/**
 * Fast API Server
 * Serves product-discount data from Redis cache
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import redisService from './services/redis.service';
import config from './config';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
 */
app.get('/api/products/discounts', async (req: Request, res: Response) => {
  try {
    if (!redisService.isReady()) {
      return res.status(503).json({ error: 'Redis cache not available' });
    }

    const products = await redisService.getAllProductsWithDiscounts();

    res.json({
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * Get products with discounts for a specific store
 * GET /api/stores/:storeId/products/discounts
 */
app.get('/api/stores/:storeId/products/discounts', async (req: Request, res: Response) => {
  try {
    if (!redisService.isReady()) {
      return res.status(503).json({ error: 'Redis cache not available' });
    }

    const { storeId } = req.params;
    const products = await redisService.getStoreProductsWithDiscounts(storeId);

    res.json({
      storeId,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error('Error getting store products:', error);
    res.status(500).json({ error: 'Failed to fetch store products' });
  }
});

/**
 * Get a specific product with discounts
 * GET /api/stores/:storeId/products/:productId
 */
app.get('/api/stores/:storeId/products/:productId', async (req: Request, res: Response) => {
  try {
    if (!redisService.isReady()) {
      return res.status(503).json({ error: 'Redis cache not available' });
    }

    const { storeId, productId } = req.params;
    const product = await redisService.getProductDiscounts(storeId, parseInt(productId));

    if (!product) {
      return res.status(404).json({ error: 'Product not found or has no discounts' });
    }

    res.json(product);
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
    app.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 Fast API Server running on http://localhost:${PORT}`);
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

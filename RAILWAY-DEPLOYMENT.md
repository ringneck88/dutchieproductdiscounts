# Railway Deployment Guide - Redis + API

Deploy the hybrid system to Railway with Redis in **5 minutes**.

## Why Railway?

✅ **Redis Built-in** - Just click to add
✅ **Free Tier** - $5 credit/month (enough for small-medium sites)
✅ **Auto-scaling** - Handles traffic spikes
✅ **Easy Setup** - No Docker/K8s knowledge needed

---

## Architecture on Railway

```
┌─────────────────────────────────────────┐
│          Railway Project                │
│                                         │
│  ┌──────────┐    ┌───────────────┐    │
│  │  Redis   │◄───│  Sync Service │    │
│  │ (Plugin) │    │   (runs/15min)│    │
│  └────┬─────┘    └───────────────┘    │
│       │                                 │
│       │          ┌───────────────┐    │
│       └─────────►│   Fast API    │    │
│                  │ (port 3000)   │    │
│                  └───────┬───────┘    │
└──────────────────────────┼────────────┘
                           │
                           ↓
                    Your Frontend
```

---

## Step 1: Create Railway Project

### Option A: Via GitHub (Recommended)

1. **Push your code to GitHub**
   ```bash
   cd dutchieproductdiscounts
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create dutchie-sync --public
   git push -u origin main
   ```

2. **Connect to Railway**
   - Go to https://railway.app
   - Click "Start a New Project"
   - Choose "Deploy from GitHub repo"
   - Select your `dutchie-sync` repo

### Option B: Via Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## Step 2: Add Redis to Your Project

This is incredibly easy on Railway:

1. **In your Railway project dashboard**, click **"+ New"**
2. Select **"Database"**
3. Choose **"Add Redis"**
4. Done! ✅

Railway automatically creates a Redis instance and sets the `REDIS_URL` environment variable.

---

## Step 3: Configure Environment Variables

In your Railway project settings, add these variables:

```env
# Dutchie API
DUTCHIE_API_URL=https://api.pos.dutchie.com
DUTCHIE_PRODUCT_LOOKBACK_HOURS=24

# Strapi (your existing Strapi instance)
STRAPI_API_URL=https://your-strapi-domain.com
STRAPI_API_TOKEN=your_strapi_token_here

# Redis - Auto-set by Railway, but can override
# REDIS_URL=redis://...  (Railway sets this automatically)
REDIS_ENABLED=true

# Sync interval
SYNC_INTERVAL=15

# API Port - Railway uses $PORT
PORT=3000
```

**Note:** Railway automatically injects `REDIS_URL` when you add the Redis plugin. You don't need to set it manually!

---

## Step 4: Deploy Two Services

You'll need to create **two separate Railway services** from the same repo:

### Service 1: Sync Worker (Background Job)

```json
// railway.json (for sync service)
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run build && node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Settings in Railway Dashboard:**
- Name: `dutchie-sync`
- Start Command: `npm run build && npm start`
- No public domain needed

### Service 2: API Server (Public)

Create a second service from the same repo:

**Settings in Railway Dashboard:**
- Name: `dutchie-api`
- Start Command: `npm run build && npm run api:prod`
- **Generate Domain** (click to get a public URL like `dutchie-api.railway.app`)

---

## Step 5: Configure Build

Update `package.json` to ensure Railway builds correctly:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "api:prod": "node dist/api.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Step 6: Connect Services to Redis

Both services will automatically connect to Redis using the `REDIS_URL` variable that Railway injects.

**In Railway Dashboard:**
1. Go to your Sync service → Variables
2. Ensure it has access to the Redis plugin (should be automatic)
3. Repeat for API service

---

## Deployment Architecture

```
Railway Project: "dutchie-deals"
│
├── Service: dutchie-sync
│   ├── Connected to: Redis Plugin
│   ├── Runs: Sync job every 15 min
│   └── Not publicly accessible
│
├── Service: dutchie-api
│   ├── Connected to: Redis Plugin
│   ├── Exposes: REST API (port 3000)
│   └── Public URL: https://dutchie-api.railway.app
│
└── Database: Redis
    ├── Type: Redis Plugin
    ├── Memory: 512 MB (free tier)
    └── Auto-connected to both services
```

---

## Testing Your Deployment

### 1. Check Sync Service Logs

```bash
railway logs dutchie-sync
```

Look for:
```
✓ Redis cache enabled
Found 2 active stores to sync
...
Redis Cache Statistics:
  Cached products: 11234
  Memory used: 2.5M
```

### 2. Test API Endpoint

```bash
curl https://your-api.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "redis": "connected",
  "timestamp": "2025-10-31T..."
}
```

### 3. Query Products

```bash
curl 
```

---

## Integrate with Your Existing Website

### Option 1: Direct API Calls

```javascript
// In your Next.js/React frontend
const API_URL = 'https://your-api.railway.app';

async function getDiscountedProducts(storeId) {
  const res = await fetch(`${API_URL}/api/stores/${storeId}/products/discounts`);
  const data = await res.json();
  return data.data; // Array of products with discounts
}

// Usage
const products = await getDiscountedProducts('1');
```

### Option 2: Add to Your Existing Railway Project

If your mintdeals website is already on Railway:

1. **Add the sync service to your existing project**
2. **Add the API service to your existing project**
3. **Use the same Redis instance** your website might already have
4. **Or create a separate Redis for discounts**

---

## Cost Estimate

Railway Free Tier ($5/month credit):

| Resource | Usage | Cost |
|----------|-------|------|
| Redis (512MB) | Always on | ~$2/mo |
| Sync Service | Runs every 15min | ~$1/mo |
| API Service | Always on | ~$2/mo |
| **Total** | | **~$5/mo** (covered by free tier!) |

For production with more traffic, upgrade to Hobby plan ($5/mo per service).

---

## Monitoring

### Railway Dashboard

- **Metrics Tab**: CPU, memory, network usage
- **Logs Tab**: Real-time logs for debugging
- **Deployments Tab**: History of deployments

### Check Redis Usage

```bash
railway connect dutchie-api
# Once connected:
redis-cli info memory
redis-cli dbsize
```

---

## Scaling

### Horizontal Scaling

Railway can auto-scale your API service:

1. Go to API service settings
2. Enable "Auto-scaling"
3. Set: Min 1 replica, Max 3 replicas
4. Railway scales based on CPU/memory

### Vertical Scaling

Upgrade Redis memory:

1. Go to Redis plugin settings
2. Choose larger plan (1GB, 2GB, etc.)
3. Automatic migration, zero downtime

---

## Troubleshooting

### Sync Service Not Running

**Check logs:**
```bash
railway logs dutchie-sync --tail 100
```

**Common issues:**
- Missing `STRAPI_API_TOKEN`
- Invalid Dutchie credentials in Strapi
- Network timeout (increase Railway timeout in settings)

### API Returns 503

**Check Redis connection:**
```bash
railway logs dutchie-api | grep -i redis
```

**Fix:**
- Ensure Redis plugin is connected to API service
- Check `REDIS_ENABLED=true`
- Verify `REDIS_URL` is set (should be automatic)

### High Memory Usage

**Reduce cached data:**
```env
DUTCHIE_PRODUCT_LOOKBACK_HOURS=2  # Cache only last 2 hours
```

**Or upgrade Redis:**
- Railway dashboard → Redis plugin → Settings → Upgrade plan

---

## Alternative: Add to Your Existing Infrastructure

If you already have infrastructure set up:

### With Docker Compose

Add to your existing `docker-compose.yml`:

```yaml
services:
  # Your existing services...

  redis-discounts:
    image: redis:alpine
    volumes:
      - redis-discounts-data:/data
    networks:
      - your-network

  dutchie-sync:
    build: ./dutchieproductdiscounts
    command: npm run sync
    env_file: .env
    depends_on:
      - redis-discounts
    networks:
      - your-network

  dutchie-api:
    build: ./dutchieproductdiscounts
    command: npm run api:prod
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - redis-discounts
    networks:
      - your-network

volumes:
  redis-discounts-data:

networks:
  your-network:
    external: true
```

### With Kubernetes

See `k8s-deployment.yaml` (example configuration).

---

## Next Steps

1. **Deploy to Railway** (follow steps above)
2. **Test the API** (curl commands above)
3. **Integrate with frontend** (fetch from API)
4. **Monitor performance** (Railway metrics)
5. **Set up alerts** (Railway webhooks)

---

## Summary

✅ **What you deployed:**
- Redis cache (512MB, free tier)
- Sync service (updates every 15 min)
- REST API (public endpoint)
- Connected to your existing Strapi

✅ **What you get:**
- 100x faster queries vs database
- Auto-expiring discounts
- Scalable architecture
- $0-5/month cost

🎉 **You're live!** Your API is now serving blazing-fast discount data to your frontend!

---

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **This Project**: Check README.md and REDIS-HYBRID-GUIDE.md

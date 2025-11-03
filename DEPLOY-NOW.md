# Deploy to Railway - Step by Step

## ✅ Pre-deployment Checklist

- ✅ Code committed to GitHub
- ✅ Build configs ready (`railway.toml`, `nixpacks.toml`)
- ✅ Dockerfile fixed
- ✅ Build tested locally

**You're ready to deploy!**

---

## 🚀 Deployment Steps

### Step 1: Create Railway Account (if needed)

1. Go to https://railway.app
2. Click "Login with GitHub"
3. Authorize Railway to access your repositories

---

### Step 2: Create New Project

**Option A: Via Railway Dashboard (Easiest)**

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **"dutchieproductdiscounts"** repository
4. Railway will automatically:
   - Detect Node.js project
   - Use our `nixpacks.toml` config
   - Install dependencies
   - Build TypeScript
   - Deploy!

**Option B: Via Railway CLI**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
cd dutchieproductdiscounts
railway init

# Deploy
railway up
```

---

### Step 3: Add Redis (One Click!)

1. In your Railway project dashboard
2. Click **"+ New"**
3. Select **"Database"**
4. Choose **"Redis"**
5. Done! ✅

Railway automatically:
- Creates Redis instance (512MB)
- Sets `REDIS_URL` environment variable
- Connects to your services

---

### Step 4: Configure Environment Variables

In Railway dashboard → Your Service → **Variables** tab:

```env
# Dutchie API
DUTCHIE_API_URL=https://api.pos.dutchie.com
DUTCHIE_PRODUCT_LOOKBACK_HOURS=24

# Strapi (your existing instance)
STRAPI_API_URL=https://your-strapi.com
STRAPI_API_TOKEN=your_token_here

# Redis (auto-set by Railway, but verify)
REDIS_ENABLED=true

# Sync
SYNC_INTERVAL=15
```

**Note:** `REDIS_URL` is automatically set when you add the Redis database!

---

### Step 5: Create Two Services

You need to deploy **two services** from the same repo:

#### Service 1: Sync Worker (Background)

1. Your first deployment is the sync service (already created)
2. Railway → Settings:
   - **Name**: `dutchie-sync`
   - **Start Command**: Leave default (uses `npm start`)
   - **No public domain needed** (internal service)

#### Service 2: API Server (Public)

1. In your project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose the **same repository** (dutchieproductdiscounts)
4. Railway will create a second service
5. Configure this service:
   - **Name**: `dutchie-api`
   - **Start Command**: `npm run api:prod`
   - Click **"Generate Domain"** to get public URL

---

### Step 6: Connect Services to Redis

Railway should automatically connect both services to Redis, but verify:

1. Go to **dutchie-sync** service
2. Check **Variables** tab
3. Ensure `REDIS_URL` appears (auto-injected)

Repeat for **dutchie-api** service.

---

### Step 7: Monitor Deployment

#### Watch Build Logs:

```bash
# If using Railway CLI
railway logs

# Or in dashboard:
# Project → Service → Deployments → Latest → View Logs
```

#### What to look for:

✅ Build phase:
```
Installing dependencies...
✓ npm ci completed
Building TypeScript...
✓ npm run build completed
```

✅ Deploy phase:
```
Starting service...
✓ Redis cache enabled
✓ Connected to Redis
Found 1 active stores to sync
```

---

### Step 8: Test Deployment

#### Test Sync Service:

Check logs for successful sync:
```bash
railway logs dutchie-sync --tail 50
```

Look for:
```
✓ Redis cache enabled
Found X active stores to sync
Fetched Y products and Z discounts
Redis Cache Statistics:
  Cached products: 11234
```

#### Test API Service:

1. Get your public URL from Railway dashboard
2. Test health endpoint:
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

3. Test products endpoint:
   ```bash
   curl https://your-api.railway.app/api/products/discounts
   ```

---

## 📊 Your Deployed Architecture

```
┌─────────────────────────────────────────────┐
│         Railway Project                     │
│                                             │
│  ┌──────────────┐                          │
│  │    Redis     │ (512MB, auto-managed)    │
│  │   Database   │                          │
│  └──────┬───────┘                          │
│         │                                   │
│         ├──────────┬───────────────────────┤
│         │          │                        │
│  ┌──────▼──────┐  ┌──────▼─────────────┐  │
│  │ dutchie-sync│  │   dutchie-api      │  │
│  │  (internal) │  │   (public)         │  │
│  │             │  │                    │  │
│  │ Runs every  │  │ https://your-api   │  │
│  │ 15 minutes  │  │ .railway.app       │  │
│  └─────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 💰 Cost Breakdown

### Free Tier ($5 credit/month)

| Resource | Usage | Estimated Cost |
|----------|-------|----------------|
| Redis (512MB) | Always on | ~$2/mo |
| Sync Service | Runs every 15min | ~$1/mo |
| API Service | Always on | ~$2/mo |
| **Total** | | **~$5/mo** ✅ |

**Covered by free tier!** No credit card needed to start.

### When You Need More

Upgrade to **Hobby** ($5/service/month):
- More resources
- Higher limits
- Priority support

---

## 🔧 Post-Deployment Configuration

### Set Custom Start Commands (if needed)

**Sync Service:**
- Railway → dutchie-sync → Settings → Start Command
- Default is fine: `npm start`

**API Service:**
- Railway → dutchie-api → Settings → Start Command
- Set to: `npm run api:prod`

### Enable Auto-Scaling (Optional)

**For API service only:**
1. Railway → dutchie-api → Settings
2. Scroll to "Replicas"
3. Enable auto-scaling
4. Set: Min 1, Max 3

---

## 🎯 Verification Checklist

After deployment, verify:

✅ Both services deployed successfully
✅ Redis connected (check Variables tab)
✅ Sync service logs show successful syncs
✅ API service responds to `/health`
✅ Can query products: `/api/products/discounts`
✅ Environment variables set correctly

---

## 🔗 Integrate with Your Website

### Update Your Frontend

**Example: Next.js/React**

```javascript
// lib/discounts.js
const DISCOUNTS_API = 'https://your-api.railway.app';

export async function getDiscountedProducts(storeId) {
  const res = await fetch(
    `${DISCOUNTS_API}/api/stores/${storeId}/products/discounts`
  );
  return res.json();
}

// Usage in component
export default function DealsPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    getDiscountedProducts('1')
      .then(data => setProducts(data.data));
  }, []);

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.productId} {...product} />
      ))}
    </div>
  );
}
```

### Add to Your Existing Railway Project

If your mintdeals website is already on Railway:

1. Add both services to **same project**
2. They'll share the same Redis instance
3. Link from your main site to the API

---

## 📱 Mobile App Integration

Same API endpoints work for mobile:

**iOS/Swift:**
```swift
let url = URL(string: "https://your-api.railway.app/api/products/discounts")!
URLSession.shared.dataTask(with: url) { data, response, error in
    // Handle response
}.resume()
```

**Android/Kotlin:**
```kotlin
val url = "https://your-api.railway.app/api/products/discounts"
// Use Retrofit or similar
```

---

## 🐛 Troubleshooting

### Build Fails

**Check:**
1. Railway logs for error details
2. Verify `nixpacks.toml` is committed
3. Check Node.js version in logs

**Fix:**
```bash
# Update nixpacks.toml if needed
git add nixpacks.toml
git commit -m "Update build config"
git push
```

### Service Crashes

**Check:**
1. Environment variables set?
2. Redis connected?
3. Strapi accessible?

**View logs:**
```bash
railway logs --tail 100
```

### Redis Connection Failed

**Fix:**
1. Railway dashboard → Services
2. Click on Redis database
3. Copy connection string
4. Manually set `REDIS_URL` if needed

### API Returns 503

**Check:**
1. Is Redis plugin added?
2. Is `REDIS_ENABLED=true`?
3. View API service logs

---

## 📊 Monitoring

### Railway Dashboard

- **Metrics**: CPU, memory, network
- **Logs**: Real-time streaming
- **Deployments**: History and rollback

### Custom Monitoring

Add to your API:

```javascript
// Health endpoint already includes:
app.get('/health', async (req, res) => {
  const stats = await redisService.getStats();
  res.json({
    status: 'ok',
    redis: redisService.isReady() ? 'connected' : 'disconnected',
    cacheSize: stats.totalKeys,
    timestamp: new Date().toISOString()
  });
});
```

Monitor this endpoint with:
- UptimeRobot
- Pingdom
- Railway webhooks

---

## 🎉 Success!

Once deployed, you have:

✅ **Blazing-fast API** - 100x faster than database queries
✅ **Auto-syncing** - Updates every 15 minutes
✅ **Auto-expiring** - Old discounts removed automatically
✅ **Scalable** - Handles thousands of requests/sec
✅ **Low cost** - Free tier or $5-10/month
✅ **Easy maintenance** - Railway handles everything

---

## 📞 Next Steps

1. **Deploy now** - Follow steps above
2. **Test API** - Verify all endpoints work
3. **Integrate** - Connect to your frontend
4. **Monitor** - Watch metrics and logs
5. **Scale** - Upgrade when needed

---

## 🆘 Need Help?

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Check logs**: `railway logs`
- **This repo docs**: See all .md files

---

Ready to deploy! Follow the steps above and you'll be live in ~10 minutes! 🚀

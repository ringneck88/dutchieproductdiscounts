# Deploy via Railway Web Dashboard (Easiest!)

## 🎯 5-Minute Deployment

### Step 1: Open Railway & Login

1. Go to: **https://railway.app**
2. Click **"Login with GitHub"**
3. Authorize Railway

---

### Step 2: Create New Project

1. Click **"New Project"** (top right)
2. Select **"Deploy from GitHub repo"**
3. Find and select: **`dutchieproductdiscounts`**
4. Click **"Deploy Now"**

Railway will automatically:
- ✅ Detect Node.js project
- ✅ Read `nixpacks.toml` for build instructions
- ✅ Install dependencies (including TypeScript!)
- ✅ Run `npm run build`
- ✅ Deploy the sync service

**Wait 2-3 minutes for first build...**

---

### Step 3: Add Redis (Literally 3 Clicks!)

In your new project:

1. Click **"+ New"** (top right)
2. Click **"Database"**
3. Click **"Add Redis"**

Done! Redis is now:
- ✅ Created (512MB instance)
- ✅ Connected to your service
- ✅ `REDIS_URL` auto-injected

**Cost: ~$2/month (covered by free $5 credit)**

---

### Step 4: Set Environment Variables

Click on your **dutchie-sync** service → **Variables** tab:

Click **"+ New Variable"** and add these:

```
DUTCHIE_API_URL = https://api.pos.dutchie.com
DUTCHIE_PRODUCT_LOOKBACK_HOURS = 24
STRAPI_API_URL = https://your-strapi-url.com
STRAPI_API_TOKEN = your_actual_token
REDIS_ENABLED = true
SYNC_INTERVAL = 15
```

**Note:** `REDIS_URL` should already be there (auto-set by Redis plugin)

Click **"Save"** - Railway will redeploy automatically.

---

### Step 5: Verify Sync Service Works

1. Click on your **dutchie-sync** service
2. Go to **"Deployments"** tab
3. Click on the latest deployment
4. Click **"View Logs"**

**Look for:**
```
✓ Redis cache enabled
✓ Connected to Redis
Found 1 active stores to sync
Fetched X products and Y discounts
...
Redis Cache Statistics:
  Cached products: 11234
  Memory used: 2.5M
```

✅ **If you see this, sync is working!**

---

### Step 6: Deploy API Service (Public Endpoint)

Now let's create the API that your website will call:

1. In your project, click **"+ New"** → **"GitHub Repo"**
2. Select the **SAME repository**: `dutchieproductdiscounts`
3. Railway creates a second service
4. Click on this new service
5. Go to **Settings** tab:
   - **Name**: Change to `dutchie-api`
   - **Start Command**: Change to `npm run api:prod`
   - **Save Changes**

6. Go to **Settings** → **Networking** section:
   - Click **"Generate Domain"**
   - Copy your public URL: `https://dutchie-api-xxxxx.railway.app`

7. Add **same environment variables** as sync service:
   ```
   DUTCHIE_API_URL = https://api.pos.dutchie.com
   STRAPI_API_URL = your-strapi-url
   STRAPI_API_TOKEN = your-token
   REDIS_ENABLED = true
   PORT = 3000
   ```

**Wait for deployment...**

---

### Step 7: Test Your API!

Copy your API URL from the previous step, then test:

```bash
# Test health endpoint
curl https://dutchie-api-xxxxx.railway.app/health
```

**Expected response:**
```json
{
  "status": "ok",
  "redis": "connected",
  "timestamp": "2025-10-31T..."
}
```

```bash
# Test products endpoint
curl https://dutchie-api-xxxxx.railway.app/api/products/discounts
```

**Expected response:**
```json
{
  "count": 11234,
  "data": [ /* array of products with discounts */ ]
}
```

✅ **If both work, you're deployed!**

---

## 📊 Your Deployed Architecture

```
Railway Project
│
├─ Redis (512MB)
│  └─ Auto-connected to both services
│
├─ dutchie-sync (Internal)
│  └─ Runs every 15 min
│  └─ Populates Redis cache
│
└─ dutchie-api (Public)
   └─ https://dutchie-api-xxxxx.railway.app
   └─ Serves fast queries from Redis
```

---

## 🎯 What to Do With Your API URL

### Option 1: Use in Your Existing Website

**Add to your frontend:**

```javascript
// config.js
export const DISCOUNTS_API = 'https://dutchie-api-xxxxx.railway.app';

// Use in components
import { DISCOUNTS_API } from './config';

async function getDeals(storeId) {
  const res = await fetch(`${DISCOUNTS_API}/api/stores/${storeId}/products/discounts`);
  const data = await res.json();
  return data.data;
}
```

### Option 2: Add to Your Existing Railway Project

If mintdeals is already on Railway:

1. Go to your mintdeals project
2. Add the `dutchie-sync` and `dutchie-api` services there
3. They can share infrastructure and networking

---

## 💰 Cost Check

After deployment, check cost estimate:

1. Railway dashboard → Your project
2. Click **"Usage"** tab
3. See estimated monthly cost

**Expected:**
- Free tier: $0 (covered by $5 credit)
- With usage: $3-5/month
- High traffic: Upgrade to Hobby ($5/service)

---

## 🔧 Configuration Tips

### Change Sync Frequency

Update `SYNC_INTERVAL` variable:
- `15` = Every 15 minutes (recommended)
- `30` = Every 30 minutes (less frequent)
- `5` = Every 5 minutes (more frequent, higher cost)

### Reduce Data Cached

Update `DUTCHIE_PRODUCT_LOOKBACK_HOURS`:
- `24` = Last 24 hours (default)
- `2` = Last 2 hours (less data, less memory)
- `48` = Last 48 hours (more data)

### Enable/Disable Redis

Set `REDIS_ENABLED`:
- `true` = Use Redis cache (fast!)
- `false` = Skip Redis (use only Strapi)

---

## 📱 API Endpoints Available

Your API URL: `https://dutchie-api-xxxxx.railway.app`

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/cache/stats` | Cache statistics |
| `GET /api/products/discounts` | All products (all stores) |
| `GET /api/stores/:id/products/discounts` | Products for specific store |
| `GET /api/stores/:id/products/:productId` | Single product details |
| `DELETE /api/stores/:id/cache` | Clear cache for store |

---

## 🐛 Troubleshooting

### Build Fails

**Check logs:**
1. Click on service → Deployments → Latest → View Logs
2. Look for error messages

**Common fixes:**
- Ensure `nixpacks.toml` is in repo
- Check Node.js version
- Verify `package.json` has correct scripts

### Service Crashes

**Check:**
- Environment variables set correctly?
- Redis connected? (check Variables tab for `REDIS_URL`)
- Strapi accessible from Railway?

**View runtime logs:**
1. Service → Deployments → Latest → View Logs
2. Look for error messages after "Starting..."

### API Returns 503

**Possible causes:**
1. Redis not connected
2. `REDIS_ENABLED` not set
3. Service not started

**Fix:**
1. Check Redis plugin is added
2. Verify environment variables
3. Restart service (Settings → Restart)

---

## ✅ Success Checklist

After deployment, verify:

- ✅ Both services show "Active" status
- ✅ Redis plugin shows "Connected"
- ✅ Sync logs show successful syncs
- ✅ API health check returns 200
- ✅ API returns product data
- ✅ Environment variables all set

---

## 🎉 You're Live!

**What you now have:**

1. ✅ **Auto-syncing service** - Updates every 15 min
2. ✅ **Fast API** - 100x faster than database
3. ✅ **Redis cache** - Auto-expiring discounts
4. ✅ **Public endpoint** - Ready for frontend
5. ✅ **Monitoring** - Railway dashboard shows everything
6. ✅ **Scalable** - Auto-scales with traffic

**API URL to use in your code:**
```
https://dutchie-api-xxxxx.railway.app
```

---

## 📞 Next Steps

1. ✅ **Deployed** - Services are live!
2. 🔗 **Integrate** - Add API to your website
3. 📊 **Monitor** - Watch Railway metrics
4. 🚀 **Scale** - Upgrade when needed

**Integration example:**
```javascript
// In your website
fetch('https://dutchie-api-xxxxx.railway.app/api/stores/1/products/discounts')
  .then(r => r.json())
  .then(data => {
    console.log(`Found ${data.count} products with discounts!`);
    // Display in your UI
  });
```

---

## 🆘 Need Help?

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Project Docs**: See all .md files in repo
- **API Docs**: `REDIS-HYBRID-GUIDE.md`

---

**Deployment time: ~10 minutes total!** 🚀

Follow the steps above and you'll be live shortly!

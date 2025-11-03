# ✅ Railway Deployment Checklist

Follow this step-by-step to deploy in ~10 minutes.

---

## 📋 Pre-Deployment

- ✅ Code committed to GitHub (you've already done this!)
- ✅ Build configs ready (railway.toml, nixpacks.toml)
- ✅ TypeScript build works locally
- ✅ Environment variables prepared

**Status: READY TO DEPLOY! 🚀**

---

## 🎯 Deployment Steps

### ☐ Step 1: Login to Railway (1 min)

1. Go to: **https://railway.app**
2. Click: **"Login with GitHub"**
3. Authorize Railway to access repos
4. You're in! ✅

---

### ☐ Step 2: Create Project (2 min)

1. Click: **"New Project"**
2. Select: **"Deploy from GitHub repo"**
3. Choose: **dutchieproductdiscounts**
4. Click: **"Deploy Now"**
5. Wait for build (~2 minutes)

**Watch for:**
```
✓ Installing dependencies
✓ Building TypeScript
✓ Deploy successful
```

**✅ Service 1 (Sync) is now deploying!**

---

### ☐ Step 3: Add Redis (30 seconds)

1. Click: **"+ New"** button
2. Click: **"Database"**
3. Click: **"Add Redis"**
4. Done! ✅

**Auto-configured:**
- 512MB Redis instance
- `REDIS_URL` variable set
- Connected to your service

---

### ☐ Step 4: Set Environment Variables (2 min)

Click on **dutchie-sync** service → **Variables** tab

Add these variables (one at a time):

```
Name: DUTCHIE_API_URL
Value: https://api.pos.dutchie.com
```

```
Name: DUTCHIE_PRODUCT_LOOKBACK_HOURS
Value: 24
```

```
Name: STRAPI_API_URL
Value: [your-strapi-url]
```

```
Name: STRAPI_API_TOKEN
Value: [your-token]
```

```
Name: REDIS_ENABLED
Value: true
```

```
Name: SYNC_INTERVAL
Value: 15
```

**Note:** `REDIS_URL` should already be there from Redis plugin

Click **"Deploy"** button after adding all variables

**✅ Variables configured!**

---

### ☐ Step 5: Verify Sync Works (1 min)

1. Click: **dutchie-sync** service
2. Go to: **"Deployments"** tab
3. Click: Latest deployment
4. Click: **"View Logs"**

**Look for these lines:**
```
✓ Redis cache enabled
✓ Connected to Redis
Found X active stores to sync
Fetched Y products and Z discounts
Redis Cache Statistics:
  Cached products: ...
```

**✅ If you see this, sync service is working!**

---

### ☐ Step 6: Deploy API Service (3 min)

Back in your project:

1. Click: **"+ New"** → **"GitHub Repo"**
2. Select: **dutchieproductdiscounts** (same repo!)
3. Railway creates second service

Configure this service:

1. Click on the new service
2. Go to: **"Settings"** tab
3. **Service Name**: Change to `dutchie-api`
4. **Start Command**: Change to `npm run api:prod`
5. Click: **"Save"**

Generate public URL:

1. Still in Settings
2. Scroll to: **"Networking"** section
3. Click: **"Generate Domain"**
4. Copy your URL: `https://dutchie-api-xxxxx.railway.app`

Add environment variables:

1. Go to: **"Variables"** tab
2. Add the SAME variables as sync service (except SYNC_INTERVAL)
3. Add one more:
   ```
   Name: PORT
   Value: 3000
   ```

**✅ API service deploying!**

---

### ☐ Step 7: Test API (1 min)

Use your copied URL from step 6:

**Test 1: Health Check**
```bash
curl https://dutchie-api-xxxxx.railway.app/health
```

**Expected:**
```json
{
  "status": "ok",
  "redis": "connected"
}
```

**Test 2: Get Products**
```bash
curl https://dutchie-api-xxxxx.railway.app/api/products/discounts
```

**Expected:**
```json
{
  "count": 11234,
  "data": [ ... products ... ]
}
```

**✅ If both work, deployment is complete!**

---

## 🎉 Deployment Complete!

### What You Now Have:

✅ **Sync Service** - Updates cache every 15 min
✅ **API Service** - Fast public endpoint
✅ **Redis Cache** - 100x faster queries
✅ **Auto-scaling** - Handles traffic spikes
✅ **Monitoring** - Railway dashboard

### Your API URL:
```
https://dutchie-api-xxxxx.railway.app
```

### Cost:
- **$0-5/month** (covered by free tier!)

---

## 📊 Post-Deployment

### ☐ Monitor Services

**Railway Dashboard shows:**
- CPU usage
- Memory usage
- Request count
- Error rate

**Check logs:**
- Click service → Deployments → View Logs
- Watch for errors or issues

### ☐ Test All Endpoints

| Endpoint | Test Command |
|----------|-------------|
| Health | `curl https://your-api.railway.app/health` |
| All products | `curl https://your-api.railway.app/api/products/discounts` |
| Store products | `curl https://your-api.railway.app/api/stores/1/products/discounts` |
| Cache stats | `curl https://your-api.railway.app/api/cache/stats` |

### ☐ Integrate with Frontend

**Add to your website code:**

```javascript
const DISCOUNTS_API = 'https://dutchie-api-xxxxx.railway.app';

// Fetch discounted products
async function getDeals() {
  const response = await fetch(`${DISCOUNTS_API}/api/products/discounts`);
  const data = await response.json();
  return data.data;
}
```

---

## 🔧 Optional Optimizations

### Enable Auto-Scaling (API Service)

1. dutchie-api → Settings
2. Scroll to "Replicas"
3. Toggle on "Auto-scaling"
4. Set: Min 1, Max 3

### Add Custom Domain (API Service)

1. dutchie-api → Settings → Networking
2. Click "Add Custom Domain"
3. Enter: `api.yourdomain.com`
4. Add CNAME record to your DNS

### Set Up Monitoring Alerts

1. Project → Settings
2. Add Slack webhook or email
3. Get notified of deployment failures

---

## 🐛 Troubleshooting

### Sync Service Fails

**Check:**
- Environment variables set?
- Strapi accessible?
- Redis connected?

**Fix:**
- View logs for specific error
- Verify all variables
- Restart service

### API Returns 503

**Check:**
- Service running?
- Redis connected?
- `REDIS_ENABLED=true`?

**Fix:**
- Check deployment logs
- Verify Redis plugin active
- Restart API service

### Build Fails

**Check:**
- Is `nixpacks.toml` in repo?
- Node version correct?

**Fix:**
- Verify files committed
- Check Railway build logs
- See `BUILD-TROUBLESHOOTING.md`

---

## 📈 Performance Metrics

After 24 hours, check:

**Railway Dashboard:**
- Response times (should be <10ms)
- Memory usage (Redis)
- Request count
- Error rate

**Expected performance:**
- **Query time**: 1-5ms ⚡
- **Cache hit rate**: >95%
- **Memory usage**: <100MB
- **Uptime**: 99.9%

---

## 💰 Cost Monitor

**Check monthly estimate:**
1. Railway → Project → Usage
2. View current spending
3. Set budget alerts

**Typical costs:**
- **Free tier**: $0 (if under $5/month)
- **Light usage**: $3-5/month
- **Medium usage**: $10-15/month
- **High traffic**: $20-30/month

---

## ✅ Final Checklist

Mark these off as you verify:

- ☐ Sync service deployed and running
- ☐ API service deployed and running
- ☐ Redis connected to both services
- ☐ Health check returns 200 OK
- ☐ Products endpoint returns data
- ☐ All environment variables set
- ☐ Logs show no errors
- ☐ API URL saved for frontend
- ☐ Monitoring set up
- ☐ Cost estimate acceptable

---

## 🎊 Success!

**You've deployed a production-ready system with:**

- ✅ 100x faster queries than database
- ✅ Auto-syncing every 15 minutes
- ✅ Auto-expiring cache
- ✅ Scalable architecture
- ✅ Full monitoring
- ✅ $0-5/month cost

**API ready for integration:**
```
https://dutchie-api-xxxxx.railway.app
```

---

## 📞 Next Steps

1. **Integrate** - Add API to your website
2. **Test** - Verify in production
3. **Monitor** - Watch metrics
4. **Scale** - Upgrade if needed

**Documentation:**
- `DEPLOY-VIA-WEB.md` - Detailed guide
- `REDIS-HYBRID-GUIDE.md` - API docs
- `BUILD-TROUBLESHOOTING.md` - Fix issues

---

🚀 **Congratulations on your deployment!**

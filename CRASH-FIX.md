# Railway Crash - Quick Fixes

## 🔍 Step 1: Check the Error

In Railway dashboard:
1. Click on your crashed service
2. Go to **"Deployments"** tab
3. Click the failed deployment
4. Click **"View Logs"**
5. Scroll to the **bottom** - the error will be there

**Common errors and fixes below:**

---

## ❌ Error: "STRAPI_API_TOKEN is required"

**Fix:** Add environment variable

Railway → Your Service → **Variables** tab:
```
STRAPI_API_TOKEN = dummy-for-now
```

---

## ❌ Error: "Cannot find module" or "MODULE_NOT_FOUND"

**Cause:** Build didn't complete properly

**Fix:** Rebuild
1. Railway → Settings → **Redeploy**
2. Or push a small change:
   ```bash
   git commit --allow-empty -m "Trigger rebuild"
   git push
   ```

---

## ❌ Error: "Failed to fetch stores from Strapi"

**Cause:** No Strapi configured yet

**Fix:** Make Strapi optional

Quick patch - edit this file locally and push:

**File:** `src/services/sync.service.ts`

Find line ~70:
```typescript
const stores = await storeService.getValidStores();
```

Change to:
```typescript
const stores = await storeService.getValidStores().catch(() => {
  console.warn('⚠️  Strapi not available, using test store');
  return [{
    id: '1',
    name: 'Test Store',
    dutchieApiKey: '7b740c2ee6f94e698b2e7bbf8cf2ddb1',
    dutchieRetailerId: 'test',
    isActive: true,
  }];
});
```

This will use a hardcoded test store if Strapi is not available.

---

## ❌ Error: "Redis connection failed"

**Cause:** Redis not added or not connected

**Fix:**
1. Railway → Your Project → **"+ New"** → **"Database"** → **"Add Redis"**
2. Wait 30 seconds for connection
3. Redeploy service

---

## ❌ Error: "Port already in use" or "EADDRINUSE"

**Cause:** Wrong PORT configuration

**Fix:**

Add to Railway variables:
```
PORT = 3000
```

Or ensure your code uses:
```typescript
const PORT = process.env.PORT || 3000;
```

---

## ❌ Error: "Cannot read property of undefined"

**Cause:** Missing environment variable

**Fix:** Set ALL required variables:

```
DUTCHIE_API_URL = https://api.pos.dutchie.com
REDIS_ENABLED = true
STRAPI_API_TOKEN = dummy
```

---

## 🚀 Quick Fix: Make It Work Now

If you just want it to work immediately, here's a minimal config:

### Railway Variables:
```
DUTCHIE_API_URL = https://api.pos.dutchie.com
DUTCHIE_PRODUCT_LOOKBACK_HOURS = 24
REDIS_ENABLED = false
STRAPI_API_URL = http://localhost:1337
STRAPI_API_TOKEN = dummy
SYNC_INTERVAL = 15
```

**Set `REDIS_ENABLED = false` to skip Redis for now**

This will make the sync work with just Strapi (or skip both).

---

## 🔧 Better Fix: Update Code to Handle Missing Services

Let me create a crash-resistant version:

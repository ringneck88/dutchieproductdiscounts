# Running Without Strapi (Redis-Only Mode)

## For Testing: Skip Strapi, Use Only Redis

If you want to test the system without setting up Strapi first, you can temporarily disable it.

### Option 1: Set Dummy Values (Quick)

In Railway environment variables, set:

```
STRAPI_API_URL = http://localhost:1337
STRAPI_API_TOKEN = dummy
```

The sync service will try to connect but continue if it fails (graceful degradation).

### Option 2: Comment Out Strapi Code (Better)

**File:** `src/services/sync.service.ts`

Find this line (around line 155):
```typescript
const wasCreated = await this.syncProductDiscountPair(
  product,
  discount,
  store
);
```

Wrap it in a try-catch to skip Strapi errors:
```typescript
try {
  const wasCreated = await this.syncProductDiscountPair(
    product,
    discount,
    store
  );
  if (wasCreated) {
    storeStats.created++;
    globalStats.created++;
  } else {
    storeStats.updated++;
    globalStats.updated++;
  }
} catch (error) {
  // Skip Strapi errors, Redis cache still works
  console.warn(`Strapi sync skipped: ${error.message}`);
}
```

### What You'll Have:

**With Redis only:**
- ✅ Fast API queries (1-5ms)
- ✅ Auto-expiring cache
- ✅ Sync service populates Redis
- ❌ No Strapi admin UI
- ❌ No persistent storage (data lost if Redis restarts)

**Good for:**
- Testing the system
- Proof of concept
- Frontend development

**Not good for:**
- Production (no persistence)
- Store management (no admin UI)
- Analytics (no historical data)

---

## Recommended: Set Up Strapi

Strapi gives you:
- 🎨 Admin UI for managing stores
- 💾 Persistent storage (PostgreSQL)
- 📊 Historical data & analytics
- 🔐 Secure credential management

### Quick Strapi on Railway (10 minutes):

1. **Create Strapi project:**
   ```bash
   npx create-strapi-app@latest dutchie-strapi --quickstart
   ```

2. **Push to GitHub:**
   ```bash
   cd dutchie-strapi
   git init
   git add .
   git commit -m "Init"
   gh repo create dutchie-strapi --public
   git push -u origin main
   ```

3. **Deploy to Railway:**
   - New Project → GitHub repo → dutchie-strapi
   - Add PostgreSQL database (Railway plugin)
   - Done!

4. **Get your credentials:**
   ```
   STRAPI_API_URL = https://dutchie-strapi.railway.app
   STRAPI_API_TOKEN = [from Strapi admin]
   ```

---

## Which Should You Choose?

### Use Redis-Only If:
- ❓ Just testing/exploring
- ❓ Want to see it work quickly
- ❓ Frontend development

### Set Up Strapi If:
- ✅ Production deployment
- ✅ Need admin UI
- ✅ Want persistent data
- ✅ Multiple stores to manage

---

## I Already Have Strapi!

If you have an existing Strapi instance for mintdeals:

1. **Add the store collection** (see `STRAPI_SETUP.md`)
2. **Add the product-discount collection**
3. **Generate API token** (Settings → API Tokens)
4. **Use your existing URL:**
   ```
   STRAPI_API_URL = https://your-existing-strapi.com
   STRAPI_API_TOKEN = your-token
   ```

---

## Quick Decision Tree

```
Do you have Strapi already?
├─ Yes → Use existing Strapi
│         (add collections, get token)
│
└─ No
   ├─ Want admin UI + persistence?
   │  └─ Yes → Set up Strapi (10 min)
   │
   └─ Just testing?
      └─ Yes → Use Redis-only (temporary)
```

---

## For Railway Deployment RIGHT NOW

**If you don't have Strapi yet, use these dummy values to deploy:**

```
STRAPI_API_URL = http://localhost:1337
STRAPI_API_TOKEN = test-token-ignore
```

This will let you deploy and test Redis/API functionality.

**Then set up Strapi later** when you're ready for production.

---

Would you like me to help you:
1. Connect to your existing Strapi?
2. Set up a new Strapi instance?
3. Deploy with Redis-only for now?

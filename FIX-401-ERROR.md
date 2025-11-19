# Fix 401 Unauthorized Error - Step by Step Guide

## Current Issue
Your Railway deployment is getting a 401 error when trying to access Strapi because the `STRAPI_API_TOKEN` is either:
- Invalid/expired
- Missing required permissions for the "stores" collection

---

## Step 1: Get Current Token from Railway

1. Go to https://railway.app
2. Select your project
3. Click on the service that's showing the 401 error
4. Go to **Variables** tab
5. Find `STRAPI_API_TOKEN`
6. Copy the value (it should be a long string)

**If there's NO token or it's empty:**
- Skip to Step 3 to create a new one

**If there IS a token:**
- Continue to Step 2 to test if it's valid

---

## Step 2: Test the Current Token (Optional)

If you want to verify the token is the problem:

1. Open your local `.env` file
2. Temporarily set:
   ```env
   STRAPI_API_URL=https://mintdealsbackend-production.up.railway.app
   STRAPI_API_TOKEN=<paste the token from Railway>
   ```
3. Run the test:
   ```bash
   node test-strapi-token.js
   ```
4. Check the output - it will tell you exactly what's wrong

---

## Step 3: Create New Strapi API Token

This is the most important step!

### 3.1 Log into Strapi Admin

1. Go to: https://mintdealsbackend-production.up.railway.app/admin
2. Log in with your Strapi admin credentials

### 3.2 Navigate to API Tokens

1. Click **Settings** (⚙️ icon in left sidebar)
2. Under "GLOBAL SETTINGS", click **API Tokens**
3. Click **+ Create new API Token** button

### 3.3 Configure the Token

Fill in these details:

**Name:** `Dutchie Sync Service`

**Description:** `Token for dutchie product discount sync service`

**Token duration:** `Unlimited` (or at least 90 days)

**Token type:** Select **Custom**

### 3.4 Set Permissions (CRITICAL!)

Under the Custom permissions section, you need to enable specific permissions:

#### For "stores" collection:
- ✅ **find** (required - to fetch all stores)
- ✅ **findOne** (required - to fetch individual store)

#### For "product-discounts" collection:
- ✅ **find** (required - to query existing discounts)
- ✅ **findOne** (required - to query individual discounts)
- ✅ **create** (required - to add new discount records)
- ✅ **update** (required - to update discount records)
- ✅ **delete** (required - to remove old/expired discounts)

**IMPORTANT:** If you don't see the "stores" or "product-discounts" collections:
- The collections might not exist in your Strapi
- You need to create them first (see STRAPI_SETUP.md)

### 3.5 Save and Copy Token

1. Click **Save** button
2. **IMMEDIATELY COPY THE TOKEN** - you won't see it again!
3. It should be a very long string (200+ characters)
4. Keep it safe temporarily - you'll use it in Step 4

---

## Step 4: Update Railway Environment Variable

### 4.1 Add Token to Railway

1. Go back to https://railway.app
2. Select your project
3. Click on the service with the 401 error
4. Go to **Variables** tab
5. Find `STRAPI_API_TOKEN` or click **+ New Variable**
6. Set/Update:
   - **Variable:** `STRAPI_API_TOKEN`
   - **Value:** Paste the token you just created
7. Click **Add** or **Save**

### 4.2 Trigger Redeploy

Railway should automatically redeploy when you change environment variables.

If it doesn't:
1. Go to **Deployments** tab
2. Click the **⋮** menu on the latest deployment
3. Click **Redeploy**

---

## Step 5: Verify the Fix

### 5.1 Check Railway Logs

1. In Railway, go to the **Logs** tab
2. Watch for these messages:
   - ✅ `Fetching active stores from Strapi...`
   - ✅ `Found X active stores`
   - ✅ `Sync completed successfully`

### 5.2 Look for Errors

If you still see errors:
- ❌ `401 Unauthorized` - Token is still wrong, repeat Step 3
- ❌ `403 Forbidden` - Token lacks permissions, check Step 3.4
- ❌ `404 Not Found` - Collection doesn't exist, check STRAPI_SETUP.md

### 5.3 Test the Token Locally (Optional)

Update your local `.env` with the new token and run:

```bash
STRAPI_API_URL=https://mintdealsbackend-production.up.railway.app
STRAPI_API_TOKEN=<your new token>
```

Then test:
```bash
node test-strapi-token.js
```

You should see:
```
✅ Successfully fetched stores!
✅ Successfully fetched product-discounts!
```

---

## Troubleshooting

### Still Getting 401 After Creating New Token?

**Check 1: Token was copied correctly**
- No extra spaces
- Complete string (should be 200+ chars)
- Not truncated

**Check 2: Permissions are set**
- Go back to Strapi → Settings → API Tokens
- Click on your token
- Verify "stores" has find + findOne
- Verify "product-discounts" has all 5 permissions

**Check 3: Collections exist**
- Go to Strapi → Content Manager
- You should see "Stores" and "Product Discounts" in the left sidebar
- If not, you need to create them (see STRAPI_SETUP.md)

### Getting 403 Forbidden?

Your token is valid but lacks permissions:
- Go to Strapi → Settings → API Tokens
- Edit your token
- Enable the missing permissions (see Step 3.4)

### Getting 404 Not Found?

The API endpoint doesn't exist:
- Check that STRAPI_API_URL is correct
- Verify collections exist in Strapi
- Make sure you're using Strapi v4 or v5

---

## Success Indicators

You'll know it's working when you see in Railway logs:

```
🔄 Starting Dutchie Product Discount Sync...
Fetching active stores from Strapi...
Found 2 active stores (out of 2 total)

Syncing store: Store Name 1 (ID: 1)
✓ Fetched 245 products from Dutchie
✓ Processed 127 products with discounts
✓ Synced 127 product-discount records to Strapi

Syncing store: Store Name 2 (ID: 2)
✓ Fetched 312 products from Dutchie
✓ Processed 156 products with discounts
✓ Synced 156 product-discount records to Strapi

✅ Sync completed successfully!
```

---

## Quick Reference

**Strapi Admin:** https://mintdealsbackend-production.up.railway.app/admin
**Railway Dashboard:** https://railway.app
**Test Script:** `node test-strapi-token.js`

**Required Permissions:**
- `stores`: find, findOne
- `product-discounts`: find, findOne, create, update, delete

---

## Need More Help?

If you're still stuck after following all steps:
1. Run `node test-strapi-token.js` with the new token
2. Copy the full output
3. Check Railway logs for the full error message
4. Verify the "stores" collection exists and has data in Strapi

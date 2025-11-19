# Check if your Deals Page Can Access the Data

## Important: Public Access vs API Token Access

The sync service uses an **API Token** to write data to Strapi.

But your **Deals page (frontend)** needs **PUBLIC access** to READ the data!

---

## How to Enable Public Access for Your Deals Page:

### 1. Go to Strapi Admin
https://mintdealsbackend-production.up.railway.app/admin

### 2. Navigate to Settings → Roles → Public

1. Click **Settings** (⚙️) in the left sidebar
2. Under "USERS & PERMISSIONS PLUGIN", click **Roles**
3. Click on **Public** role
4. Scroll down to **Permissions**

### 3. Enable Product-discounts Permissions

Find **PRODUCT-DISCOUNT** in the permissions list and check:
- ✅ **find** (allows querying all product-discounts)
- ✅ **findOne** (allows querying single product-discount)

### 4. Enable Stores Permissions (if needed)

Find **STORE** and check:
- ✅ **find**
- ✅ **findOne**

### 5. Save

Click **Save** button at the top right.

---

## Test Public Access (No Auth Required)

Once you enable public access, test it:

### REST API Test:
```bash
curl "https://mintdealsbackend-production.up.railway.app/api/product-discounts?pagination[limit]=5"
```

### GraphQL Test:
```bash
curl -X POST "https://mintdealsbackend-production.up.railway.app/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ productDiscounts { productName discountName } }"}'
```

---

## If Your Deals Page Still Doesn't Show Data

Check these:

1. **Is the Deals page pointing to the correct Strapi URL?**
   - Should be: `https://mintdealsbackend-production.up.railway.app`

2. **Is it using the correct endpoint?**
   - REST: `/api/product-discounts`
   - GraphQL: `/graphql`

3. **Check browser console for errors**
   - Open Deals page
   - Press F12 → Console tab
   - Look for 403 (Forbidden) or 401 (Unauthorized) errors

4. **Does the query match the field names?**
   - productName (not product_name)
   - discountName (not discount_name)
   - storeName (not store_name)

---

## Need Help?

Share:
1. The URL of your Deals page
2. Any error messages in browser console
3. Where your frontend code is located

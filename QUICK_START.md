# Quick Start Guide

Get your Dutchie-Strapi sync running in minutes!

## Prerequisites Checklist

- [ ] Node.js v18+ installed
- [ ] Strapi instance running (mintdeals website)
- [ ] Dutchie API credentials for each store location
- [ ] Access to Strapi admin panel

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Strapi

#### A. Add Store Collection Fields

In Strapi admin, edit your `store` collection type to include:
- `dutchieApiKey` (Text, Required, Private)
- `dutchieRetailerId` (Text, Required)
- `isActive` (Boolean, Default: true)

See `strapi-schema/store-collection-example.md` for details.

#### B. Add Product-Discount Collection

In Strapi admin, create new collection type `product-discount`:
- Follow field list in `STRAPI_SETUP.md`, OR
- Copy `strapi-schema/product-discount.json` to your Strapi project

#### C. Generate API Token

1. Settings → API Tokens → Create new
2. Name: "Dutchie Sync Script"
3. Permissions: Full access OR custom with:
   - `product-discount`: create, update, delete, find
   - `store`: find, findOne
4. Copy the generated token

### 3. Add Your Stores

In Strapi admin, add entries to `store` collection:

**Example Store:**
- name: "Downtown Location"
- dutchieApiKey: "your_dutchie_api_key_here"
- dutchieRetailerId: "your_retailer_id_here"
- location: "123 Main St, Denver, CO"
- isActive: true

Repeat for each location.

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DUTCHIE_API_URL=https://api.pos.dutchie.com
STRAPI_API_URL=http://localhost:1337
STRAPI_API_TOKEN=paste_your_token_here
```

### 5. Run First Sync

```bash
npm run dev
```

You should see output like:
```
Starting multi-store sync process...
Found 2 active stores to sync

==================================================
Syncing store: Downtown Location
==================================================
Fetching products from Dutchie API...
Fetched 150 products and 12 discounts
...
```

## Verification

### Check Strapi

1. Open Strapi admin
2. Go to Content Manager → Product Discounts
3. You should see entries with product and discount information

### Test GraphQL

1. Open http://localhost:1337/graphql
2. Run this query:

```graphql
query {
  productDiscounts(filters: { discountIsActive: { eq: true } }) {
    data {
      attributes {
        productName
        discountName
        storeName
      }
    }
  }
}
```

## Scheduled Sync (Production)

To run sync automatically every 15 minutes:

### Quick Method (Built-in Scheduler):

1. Edit `.env`:
   ```env
   SYNC_INTERVAL=15
   ```

2. Build and start:
   ```bash
   npm run build
   npm start
   ```

The sync will run continuously, executing every 15 minutes.

### Production Method (PM2 - Recommended):

1. Install PM2:
   ```bash
   npm install -g pm2
   ```

2. Start with PM2:
   ```bash
   npm run build
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

PM2 will automatically restart on system reboot and handle logging.

**See `DEPLOYMENT.md` for more options:** cron jobs, Windows Task Scheduler, Docker, etc.

## Troubleshooting

### "No active stores found"
- Check that stores exist in Strapi
- Verify `isActive: true` on store entries
- Ensure stores have `dutchieApiKey` and `dutchieRetailerId`

### "STRAPI_API_TOKEN is required"
- Copy API token from Strapi Settings → API Tokens
- Paste into `.env` file as `STRAPI_API_TOKEN=your_token_here`

### "Failed to fetch products"
- Verify Dutchie API key is correct for that store
- Check Dutchie API URL in `.env` (should be https://api.pos.dutchie.com)
- Check network connectivity

### GraphQL returns empty
- Ensure sync ran successfully (check console output)
- Verify GraphQL plugin is installed in Strapi
- Check API permissions for public access to product-discounts

## Next Steps

- Review `graphql-queries.md` for 13+ example queries
- Set up scheduled sync with `SYNC_INTERVAL`
- Integrate GraphQL queries into your website
- Monitor sync logs for errors

## Support Files

- **README.md** - Full documentation
- **STRAPI_SETUP.md** - Detailed Strapi setup
- **graphql-queries.md** - Query examples
- **strapi-schema/store-collection-example.md** - Store collection guide

## Architecture Overview

```
┌─────────────┐
│   Strapi    │
│   Stores    │ ← Stores with API keys
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Sync Script │ ← Loops through each store
└──────┬──────┘
       │
       ↓
┌─────────────┐     ┌──────────────┐
│ Dutchie API │ → │ Store 1 Data │
│             │     │ Store 2 Data │
└─────────────┘     └──────┬───────┘
                           │
                           ↓
                    ┌─────────────┐
                    │   Strapi    │
                    │ Product-    │ ← Product-discount
                    │ Discounts   │   pairs with store info
                    └─────────────┘
                           │
                           ↓
                    ┌─────────────┐
                    │  GraphQL    │ ← Query by store,
                    │    API      │   brand, active, etc.
                    └─────────────┘
```

Happy syncing! 🚀

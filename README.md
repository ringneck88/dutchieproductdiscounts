# Dutchie Product Discounts Sync Tool

A Node.js/TypeScript tool that syncs product and discount information from the Dutchie API to a Strapi database, creating product-discount pairs for easy querying via GraphQL.

## Features

- ✅ **Multi-Store Support** - Syncs products/discounts from multiple store locations
- ✅ **Store-Specific API Keys** - Each store has its own Dutchie API credentials stored in Strapi
- ✅ Fetches products and discounts from Dutchie API
- ✅ Creates product-discount pairs in Strapi (one entry per product-discount combination)
- ✅ Handles products with multiple discounts
- ✅ Automatic cleanup of expired/inactive discounts
- ✅ GraphQL API for querying discounted products by store
- ✅ Support for scheduled sync runs
- ✅ TypeScript for type safety
- ✅ Per-store sync statistics and error handling

## Prerequisites

- Node.js (v18 or higher)
- Existing Strapi instance (from mintdeals website)
- Dutchie API credentials for each store location (stored in Strapi)
- Strapi API token

## Installation

1. **Clone or navigate to this directory**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file with your credentials:**
   ```
   # Dutchie API base URL
   DUTCHIE_API_URL=https://api.pos.dutchie.com

   # Strapi connection (REQUIRED)
   STRAPI_API_URL=http://localhost:1337
   STRAPI_API_TOKEN=your_strapi_api_token_here

   # Optional: minutes between syncs
   SYNC_INTERVAL=60
   ```

   **Note:** Individual store API keys are stored in Strapi's `store` collection, not in `.env`

5. **Set up Strapi collection types:**

   a. Follow `STRAPI_SETUP.md` to add the `product-discount` collection type

   b. Follow `strapi-schema/store-collection-example.md` to set up or modify your `store` collection type to include:
      - `dutchieApiKey` (required, private)
      - `dutchieRetailerId` (required)
      - `isActive` (boolean, default: true)

6. **Add your stores to Strapi:**

   In Strapi admin, add entries to the `store` collection with each location's Dutchie API credentials.

## Usage

### Build the project:
```bash
npm run build
```

### Run a one-time sync:
```bash
npm run sync
```

### Run in development mode:
```bash
npm run dev
```

### Run as a scheduled service (every 15 minutes):
Set `SYNC_INTERVAL=15` in your `.env` file to enable periodic syncing:
```bash
npm start
```

For production deployment with cron jobs, PM2, Docker, etc., see `DEPLOYMENT.md`

## Data Structure

### Product Fields Stored:
- `productName` - Product name
- `productDutchieId` - Dutchie product ID
- `productDescription` - Product description
- `productImageUrl` - Product image URL
- `productBrand` - Product brand

### Discount Fields Stored:
- `discountName` - Discount name
- `discountBrand` - Discount brand
- `discountImageUrl` - Discount image URL
- `discountStartTimestamp` - When discount starts
- `discountEndTimestamp` - When discount ends
- `discountIsActive` - Whether discount is currently active
- `discountDutchieId` - Dutchie discount ID

### Store Fields Stored:
- `storeId` - Strapi store ID
- `storeName` - Store name
- `storeLocation` - Store location/address

### Product-Discount Pairing

If a product has 3 discounts, it will create 3 separate entries in Strapi:
- Entry 1: Product A + Discount 1 + Store Info
- Entry 2: Product A + Discount 2 + Store Info
- Entry 3: Product A + Discount 3 + Store Info

**Multi-Store Example:**
If you have 2 stores and Product A has 2 discounts at Store 1 and 1 discount at Store 2:
- Entry 1: Product A + Discount 1 + Store 1
- Entry 2: Product A + Discount 2 + Store 1
- Entry 3: Product A + Discount 3 + Store 2

## GraphQL Queries

See `graphql-queries.md` for comprehensive examples of querying discounted products.

### Quick Example:
```graphql
query GetActiveDiscounts {
  productDiscounts(filters: { discountIsActive: { eq: true } }) {
    data {
      id
      attributes {
        productName
        productImageUrl
        discountName
        discountEndTimestamp
      }
    }
  }
}
```

## Project Structure

```
dutchieproductdiscounts/
├── src/
│   ├── config/
│   │   └── index.ts           # Configuration management
│   ├── services/
│   │   ├── dutchie.service.ts # Dutchie API integration
│   │   ├── strapi.service.ts  # Strapi API integration
│   │   └── sync.service.ts    # Main sync logic
│   ├── types/
│   │   ├── dutchie.types.ts   # Dutchie type definitions
│   │   ├── strapi.types.ts    # Strapi type definitions
│   │   └── index.ts           # Type exports
│   └── index.ts               # Main entry point
├── strapi-schema/
│   ├── product-discount.json       # Product-discount schema
│   └── store-collection-example.md # Store collection setup guide
├── .env.example                    # Environment variables template
├── graphql-queries.md              # GraphQL query examples (13+ queries)
├── STRAPI_SETUP.md                # Strapi setup instructions
├── package.json
├── tsconfig.json
└── README.md
```

## How It Works

1. **Fetch Stores**: Retrieves all active stores with Dutchie credentials from Strapi
2. **Loop Through Stores**: For each store location:
   - Creates a Dutchie API client with that store's credentials
   - Fetches all products and discounts for that store
   - Matches which discounts apply to which products
   - Creates/updates product-discount pairs in Strapi with store info
3. **Cleanup**: Removes expired or inactive discount entries across all stores
4. **Report**: Displays overall statistics and per-store breakdown
5. **Repeat**: Optionally runs on a schedule

## Sync Process Details

The multi-store sync service:
1. **Store Discovery**: Fetches active stores from Strapi with `isActive: true`
2. **Credential Validation**: Ensures each store has required `dutchieApiKey` and `dutchieRetailerId`
3. **Per-Store Sync**: For each valid store:
   - Fetches products and discounts from Dutchie using store's API key
   - Identifies applicable discounts for each product based on:
     - Direct product-discount associations
     - Discount's applicable product list
     - Brand matching (if applicable)
   - Creates or updates entries in Strapi with store information
   - Tracks per-store statistics (products, discounts, created, updated, errors)
4. **Global Cleanup**: Removes expired/inactive discounts across all stores
5. **Comprehensive Reporting**: Shows both overall totals and per-store breakdown

## Error Handling

- Validates Strapi API token on startup
- Continues syncing other stores if one store fails
- Continues processing other product-discount pairs if one fails
- Logs all errors with context (store name, product/discount IDs)
- Returns comprehensive sync statistics including:
  - Total stores synced
  - Per-store success/failure counts
  - Overall created/updated/deleted counts
  - Total error count

## API Endpoint Customization

**Note**: The Dutchie API endpoints in `src/services/dutchie.service.ts` may need adjustment based on your actual Dutchie API documentation. Update these lines:

```typescript
// Line 24-25 in dutchie.service.ts
const response = await this.client.get(
  `/retailers/${config.dutchie.retailerId}/products`
);

// Line 40-41 in dutchie.service.ts
const response = await this.client.get(
  `/retailers/${config.dutchie.retailerId}/discounts`
);
```

## Deployment

### As a Scheduled Task (Linux/Mac):
Add to crontab to run every hour:
```bash
0 * * * * cd /path/to/dutchieproductdiscounts && /usr/bin/npm run sync >> /var/log/dutchie-sync.log 2>&1
```

### As a Service (systemd):
Create `/etc/systemd/system/dutchie-sync.service`:
```ini
[Unit]
Description=Dutchie Product Discounts Sync Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/dutchieproductdiscounts
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable dutchie-sync
sudo systemctl start dutchie-sync
```

### Docker (Optional):
Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t dutchie-sync .
docker run -d --env-file .env dutchie-sync
```

## Troubleshooting

### Configuration errors on startup
- Ensure all required environment variables are set in `.env`
- Check that API tokens are valid

### No products synced
- Verify Dutchie API credentials
- Check that products have associated discounts
- Review discount matching logic in `sync.service.ts`

### GraphQL queries return no data
- Ensure Strapi permissions are set correctly
- Verify collection type was created properly
- Check that sync ran successfully

### Connection errors
- Verify Strapi is running and accessible
- Check Dutchie API endpoint URLs
- Ensure network connectivity

## Contributing

This is a custom tool for the mintdeals website. Modify as needed for your specific requirements.

## License

MIT

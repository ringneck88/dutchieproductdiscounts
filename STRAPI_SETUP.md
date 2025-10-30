# Strapi Setup Instructions

## Adding the Product Discount Collection Type

To add the `product-discount` collection type to your existing Strapi instance:

### Option 1: Using the Strapi Admin UI (Recommended for beginners)

1. Log into your Strapi admin panel
2. Go to **Content-Type Builder** in the left sidebar
3. Click **"Create new collection type"**
4. Name it: `product-discount` (singular: `product-discount`, plural: `product-discounts`)
5. Add the following fields:

#### Product Fields:
- **productName** - Text (Short text) - Required
- **productDutchieId** - Text (Short text) - Required
- **productDescription** - Text (Long text)
- **productImageUrl** - Text (Short text)
- **productBrand** - Text (Short text)

#### Discount Fields:
- **discountName** - Text (Short text) - Required
- **discountBrand** - Text (Short text)
- **discountImageUrl** - Text (Short text)
- **discountStartTimestamp** - Date (datetime) - Required
- **discountEndTimestamp** - Date (datetime) - Required
- **discountIsActive** - Boolean - Default: true
- **discountDutchieId** - Text (Short text) - Required

#### Store Fields:
- **storeId** - Text (Short text) - Required
- **storeName** - Text (Short text)
- **storeLocation** - Text (Short text)

6. Click **Save** and wait for Strapi to restart

### Option 2: Manual File Copy (For experienced users)

1. Locate your Strapi project directory
2. Copy `strapi-schema/product-discount.json` to:
   ```
   <your-strapi-project>/src/api/product-discount/content-types/product-discount/schema.json
   ```
3. Restart your Strapi server

## Setting Up API Permissions

1. Go to **Settings** → **Users & Permissions plugin** → **Roles**
2. Edit the **Public** role:
   - Under **Product-discount**, enable:
     - `find` (to query all product discounts)
     - `findOne` (to query a single product discount)
3. Click **Save**

## Generating API Token for Sync Script

1. Go to **Settings** → **API Tokens**
2. Click **Create new API Token**
3. Name it: "Dutchie Sync Script"
4. Token duration: Unlimited (or as per your security policy)
5. Token type: **Full access** or **Custom** with:
   - `product-discount`: create, update, delete, find
   - `store`: find, findOne (to read store API credentials)
6. Click **Save** and copy the token
7. Add the token to your `.env` file as `STRAPI_API_TOKEN`

**Important:** The sync script needs access to the `store` collection to fetch Dutchie API credentials for each location.

## Enable GraphQL (if not already enabled)

1. In your Strapi project, install the GraphQL plugin:
   ```bash
   npm install @strapi/plugin-graphql
   ```
2. Add to `config/plugins.js`:
   ```javascript
   module.exports = {
     graphql: {
       enabled: true,
       config: {
         endpoint: '/graphql',
         shadowCRUD: true,
         playgroundAlways: false,
         depthLimit: 7,
         amountLimit: 100,
       },
     },
   };
   ```
3. Restart Strapi
4. Access GraphQL Playground at: `http://localhost:1337/graphql`

# Implementation Checklist

Use this checklist to track your setup progress.

## Phase 1: Strapi Configuration

- [ ] **Add/Modify Store Collection**
  - [ ] Add `dutchieApiKey` field (Text, Required, **Private**)
  - [ ] Add `dutchieRetailerId` field (Text, Required)
  - [ ] Add `isActive` field (Boolean, Default: true)
  - [ ] See: `strapi-schema/store-collection-example.md`

- [ ] **Create Product-Discount Collection**
  - [ ] Create new collection type `product-discount`
  - [ ] Add all fields from `STRAPI_SETUP.md`
  - [ ] OR copy `strapi-schema/product-discount.json` to Strapi
  - [ ] Save and restart Strapi

- [ ] **Configure API Permissions**
  - [ ] Settings → API Tokens → Create new
  - [ ] Name: "Dutchie Sync Script"
  - [ ] Permissions:
    - [ ] `product-discount`: create, update, delete, find
    - [ ] `store`: find, findOne
  - [ ] Copy the generated token

- [ ] **Enable GraphQL Plugin**
  - [ ] Install: `npm install @strapi/plugin-graphql`
  - [ ] Configure in `config/plugins.js`
  - [ ] Restart Strapi
  - [ ] Verify: http://localhost:1337/graphql

- [ ] **Add Store Entries**
  - [ ] Add Store 1 with Dutchie credentials
  - [ ] Add Store 2 with Dutchie credentials
  - [ ] Add Store 3... (repeat for all locations)
  - [ ] Set `isActive: true` for stores to sync

## Phase 2: Dutchie API Integration

- [ ] **Get Dutchie API Documentation**
  - [ ] Obtain product endpoint URL
  - [ ] Obtain discount endpoint URL
  - [ ] Get example JSON responses
  - [ ] Identify how products link to discounts

- [ ] **Update Code**
  - [ ] Update `src/services/dutchie.service.ts` with real endpoints
  - [ ] Update `src/types/dutchie.types.ts` with real data structures
  - [ ] Test API calls manually (Postman/curl)

## Phase 3: Sync Tool Setup

- [ ] **Install Dependencies**
  ```bash
  cd dutchieproductdiscounts
  npm install
  ```

- [ ] **Configure Environment**
  - [ ] Copy `.env.example` to `.env`
  - [ ] Set `DUTCHIE_API_URL` (if different from default)
  - [ ] Set `STRAPI_API_URL` (your Strapi URL)
  - [ ] Set `STRAPI_API_TOKEN` (from Phase 1)
  - [ ] Set `SYNC_INTERVAL=15` (optional, for continuous mode)

- [ ] **Build Project**
  ```bash
  npm run build
  ```

## Phase 4: Testing

- [ ] **First Test Run**
  ```bash
  npm run dev
  ```

- [ ] **Verify Output**
  - [ ] Should show "Found X active stores to sync"
  - [ ] Should show fetching products/discounts for each store
  - [ ] Should show created/updated counts
  - [ ] No errors in output

- [ ] **Verify Strapi Data**
  - [ ] Open Strapi admin
  - [ ] Check Content Manager → Product Discounts
  - [ ] Should see entries with products, discounts, and store info

- [ ] **Test GraphQL**
  - [ ] Open http://localhost:1337/graphql
  - [ ] Run query from `graphql-queries.md`
  - [ ] Should return product discount data

## Phase 5: Production Deployment

Choose one deployment method:

### Option A: PM2 (Recommended)
- [ ] Install PM2: `npm install -g pm2`
- [ ] Start: `pm2 start ecosystem.config.js`
- [ ] Save: `pm2 save`
- [ ] Auto-start on reboot: `pm2 startup`
- [ ] Verify: `pm2 status`

### Option B: Built-in Scheduler
- [ ] Set `SYNC_INTERVAL=15` in `.env`
- [ ] Run: `npm start`
- [ ] Keep process running (use screen/tmux or process manager)

### Option C: System Cron
- [ ] Make executable: `chmod +x sync-wrapper.sh`
- [ ] Edit crontab: `crontab -e`
- [ ] Add: `*/15 * * * * /path/to/sync-wrapper.sh`

### Option D: Windows Task Scheduler
- [ ] Open Task Scheduler
- [ ] Create task to run `sync.bat` every 15 minutes

### Option E: Docker
- [ ] Build: `docker-compose up -d`
- [ ] Verify: `docker-compose logs -f`

## Phase 6: Monitoring

- [ ] **Set Up Logging**
  - [ ] Create `logs` directory if needed
  - [ ] Configure log rotation
  - [ ] Set up log monitoring/alerts

- [ ] **Monitor Sync Status**
  - [ ] Check logs regularly for errors
  - [ ] Monitor Strapi for data updates
  - [ ] Verify sync runs every 15 minutes

- [ ] **Set Up Alerts** (Optional)
  - [ ] Email notifications on errors
  - [ ] Slack/Discord webhook integration
  - [ ] Monitoring service (UptimeRobot, etc.)

## Troubleshooting Checklist

If sync fails, check:

- [ ] Strapi is running and accessible
- [ ] `STRAPI_API_TOKEN` is correct and has permissions
- [ ] Stores have valid `dutchieApiKey` and `dutchieRetailerId`
- [ ] Stores have `isActive: true`
- [ ] Dutchie API endpoints are correct
- [ ] Network connectivity to Dutchie API
- [ ] Check error logs in `logs/error.log`

## Documentation Reference

- **QUICK_START.md** - Quick setup guide
- **README.md** - Full documentation
- **STRAPI_SETUP.md** - Strapi configuration details
- **DEPLOYMENT.md** - All deployment options
- **graphql-queries.md** - GraphQL query examples

## Current Status

**What's Done:**
- ✅ Multi-store architecture implemented
- ✅ TypeScript services created
- ✅ GraphQL queries documented
- ✅ Scheduling options configured
- ✅ Deployment scripts created

**What's Needed:**
- ⏳ Dutchie API endpoint information
- ⏳ Strapi setup
- ⏳ First test run
- ⏳ Production deployment

## Next Immediate Action

**→ Get Dutchie API information and update the code**

Once you provide the actual API endpoints and example responses, we'll update:
- `src/services/dutchie.service.ts` - API calls
- `src/types/dutchie.types.ts` - Data structures
- `src/services/sync.service.ts` - Discount matching logic (if needed)

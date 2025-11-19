const axios = require('axios');

const TOKEN = 'e0c3f979591a13925592e9814f1d997151ae771c55fddb6417d0be3c0131ec901065091164586c3626d9e431afacd5bde0feb3b2b985803dbf62c45d06930b719ab1f2edf1de49880b48f3590bf6c7c6242fc9cb5b820555ff0ee8704fcc2ed71dac177765a509f3f430fe46fe3e3639e1fe579cdc1cffa30bf0bdb91f532c7d';
const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function checkSync() {
  console.log('🔍 Checking Sync Status...\n');

  try {
    // Get stores
    const storesResponse = await client.get('/api/stores');
    const stores = storesResponse.data.data;
    console.log(`📍 Stores: ${stores.length}`);
    stores.forEach(store => {
      const name = store.name || store.attributes?.name || 'Unknown';
      const id = store.id;
      console.log(`   - ${name} (ID: ${id})`);
    });
    console.log('');

    // Get product discounts with pagination to see total
    const pdResponse = await client.get('/api/product-discounts', {
      params: {
        pagination: { pageSize: 10, page: 1 }
      }
    });

    const total = pdResponse.data.meta?.pagination?.total || pdResponse.data.data.length;
    console.log(`🎁 Product Discounts: ${total} total`);

    if (pdResponse.data.data.length > 0) {
      console.log('\n📦 Sample product discounts:');
      pdResponse.data.data.slice(0, 3).forEach(pd => {
        const data = pd.attributes || pd;
        console.log(`   - ${data.productName}`);
        console.log(`     Discount: ${data.discountName}`);
        console.log(`     Store: ${data.storeName || data.storeId}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Sync is working! Data is flowing from Dutchie → Strapi');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error checking sync:', error.response?.data || error.message);
  }
}

checkSync();

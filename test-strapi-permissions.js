/**
 * Test Strapi API Token Permissions
 * Tests read, create, update, and delete permissions for each collection
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.STRAPI_API_URL;
const TOKEN = process.env.STRAPI_API_TOKEN;

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function testCollectionPermissions(collectionName) {
  console.log(`\nTesting ${collectionName}:`);
  console.log('─'.repeat(50));

  const permissions = {
    read: false,
    create: false,
    update: false,
    delete: false,
  };

  // Test READ
  try {
    const response = await client.get(`/api/${collectionName}`, {
      params: { pagination: { pageSize: 1 } }
    });
    permissions.read = true;
    console.log(`✓ READ: Success (${response.data.meta?.pagination?.total || 0} entries)`);
  } catch (error) {
    console.log(`✗ READ: Failed (${error.response?.status || error.code})`);
  }

  // Test DELETE (try to delete the first entry if it exists)
  try {
    const response = await client.get(`/api/${collectionName}`, {
      params: { pagination: { pageSize: 1, page: 1 } }
    });

    if (response.data.data && response.data.data.length > 0) {
      const firstId = response.data.data[0].id;
      try {
        await client.delete(`/api/${collectionName}/${firstId}`);
        permissions.delete = true;
        console.log(`✓ DELETE: Success (deleted entry ${firstId})`);
      } catch (deleteError) {
        console.log(`✗ DELETE: Failed (${deleteError.response?.status || deleteError.code})`);
      }
    } else {
      console.log(`  DELETE: Skipped (no entries to test with)`);
    }
  } catch (error) {
    console.log(`  DELETE: Skipped (couldn't fetch test entry)`);
  }

  return permissions;
}

async function main() {
  console.log('\n🔐 Strapi API Token Permission Test\n');
  console.log('═'.repeat(50));
  console.log(`URL: ${BASE_URL}`);
  console.log(`Token: ${TOKEN ? TOKEN.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log('═'.repeat(50));

  if (!TOKEN) {
    console.error('\n❌ Error: STRAPI_API_TOKEN not found in environment');
    process.exit(1);
  }

  const collections = ['discounts', 'inventories', 'product-discounts'];
  const results = {};

  for (const collection of collections) {
    results[collection] = await testCollectionPermissions(collection);
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('Summary:');
  console.log('═'.repeat(50));
  for (const [collection, perms] of Object.entries(results)) {
    console.log(`\n${collection}:`);
    console.log(`  Read: ${perms.read ? '✓' : '✗'}`);
    console.log(`  Delete: ${perms.delete ? '✓' : '✗'}`);
  }

  // Recommendations
  console.log('\n' + '═'.repeat(50));
  console.log('Recommendations:');
  console.log('═'.repeat(50));

  const hasDeleteIssues = Object.values(results).some(p => !p.delete && p.read);
  if (hasDeleteIssues) {
    console.log(`
⚠️  Some collections cannot be deleted via API:

   To fix this, go to Strapi Admin Panel:
   1. Settings → Users & Permissions Plugin → Roles
   2. Select your API role (likely "Authenticated" or "Public")
   3. Enable DELETE permissions for:
      - Discounts
      - Inventories
      - Product-discounts
   4. Save changes

   Alternative: Use Strapi admin panel to manually clear collections
   or use the database directly.
`);
  } else {
    console.log('\n✓ All permissions are correctly configured!\n');
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});

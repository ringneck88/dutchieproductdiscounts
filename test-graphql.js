const axios = require('axios');

const TOKEN = 'e0c3f979591a13925592e9814f1d997151ae771c55fddb6417d0be3c0131ec901065091164586c3626d9e431afacd5bde0feb3b2b985803dbf62c45d06930b719ab1f2edf1de49880b48f3590bf6c7c6242fc9cb5b820555ff0ee8704fcc2ed71dac177765a509f3f430fe46fe3e3639e1fe579cdc1cffa30bf0bdb91f532c7d';
const GRAPHQL_URL = 'https://mintdealsbackend-production.up.railway.app/graphql';

async function testGraphQL() {
  console.log('🔍 Testing GraphQL endpoint for product-discounts...\n');

  const query = `
    query {
      productDiscounts(pagination: { limit: 5 }) {
        id
        productName
        discountName
        storeName
        discountIsActive
      }
    }
  `;

  try {
    const response = await axios.post(
      GRAPHQL_URL,
      { query },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.errors) {
      console.log('❌ GraphQL Errors:', JSON.stringify(response.data.errors, null, 2));
      return;
    }

    const discounts = response.data.data.productDiscounts;

    console.log(`✅ GraphQL is working!`);
    console.log(`📊 Found ${discounts.length} product discounts (showing first 5)`);
    console.log('\n📦 Sample discounts:');
    discounts.forEach(d => {
      console.log(`   - ${d.productName}`);
      console.log(`     ${d.discountName}`);
      console.log(`     Store: ${d.storeName}`);
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Your Deals page CAN query this data via GraphQL!');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testGraphQL();

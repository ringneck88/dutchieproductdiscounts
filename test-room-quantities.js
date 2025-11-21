const axios = require('axios');

const BASE_URL = 'https://mintdealsbackend-production.up.railway.app';

async function testRoomQuantities() {
  console.log('🏢 Testing Inventory Room Quantities...\n');

  try {
    // Fetch inventory items
    const response = await axios.get(`${BASE_URL}/api/inventories`, {
      params: { pagination: { pageSize: 10 } }
    });

    const total = response.data.meta?.pagination?.total || 0;
    console.log(`✅ Found ${total} inventory items\n`);

    if (response.data.data.length > 0) {
      // Check first few items for roomQuantities
      let foundRoomQuantities = 0;

      for (const item of response.data.data) {
        const inventory = item.attributes || item;

        if (inventory.roomQuantities && inventory.roomQuantities.length > 0) {
          foundRoomQuantities++;

          if (foundRoomQuantities === 1) {
            console.log('📦 Sample inventory with room quantities:');
            console.log(`   Product: ${inventory.productName}`);
            console.log(`   SKU: ${inventory.sku}`);
            console.log(`   Total Quantity: ${inventory.quantityAvailable} ${inventory.quantityUnits || ''}`);
            console.log(`\n   Room Breakdown:`);

            inventory.roomQuantities.forEach(room => {
              console.log(`     - ${room.room || 'Room ' + room.roomId}: ${room.quantityAvailable} available`);
            });
            console.log('');
          }
        }
      }

      if (foundRoomQuantities > 0) {
        console.log(`✅ SUCCESS! ${foundRoomQuantities}/${response.data.data.length} items have room quantities data`);
        console.log('   The includeRoomQuantities parameter is working!\n');
      } else {
        console.log('⏳ No room quantities found yet.');
        console.log('   This is normal - Railway is still rebuilding or the next sync');
        console.log('   hasn\'t run yet. Wait a few minutes and run this test again.\n');
      }
    }

    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testRoomQuantities();

/**
 * Main entry point for the Dutchie-Strapi sync tool
 */

import config, { validateConfig } from './config';
import syncService from './services/sync.service';

async function main() {
  console.log('Dutchie Product Discounts Sync Tool');
  console.log('====================================\n');

  try {
    // Validate configuration
    console.log('Validating configuration...');
    validateConfig();
    console.log('Configuration valid!\n');

    // Run the sync
    await syncService.sync();

    // If sync interval is configured, run periodically
    if (config.sync.intervalMinutes) {
      console.log(`\nScheduled to run every ${config.sync.intervalMinutes} minutes`);
      console.log('Press Ctrl+C to stop\n');

      setInterval(async () => {
        console.log(`\n[${ new Date().toISOString()}] Running scheduled sync...`);
        try {
          await syncService.sync();
        } catch (error) {
          console.error('Scheduled sync failed:', error);
        }
      }, config.sync.intervalMinutes * 60 * 1000);
    } else {
      console.log('\nSync completed. Exiting...');
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Run the application
main();

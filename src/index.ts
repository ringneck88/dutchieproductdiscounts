/**
 * Main entry point for the Dutchie-Strapi sync tool
 * Uses direct PostgreSQL when DATABASE_URL is configured (much faster)
 */

import { runWithSchedule } from './sync-all';

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
runWithSchedule().catch((error) => {
  console.error('\n❌ Sync failed:', error);
  process.exit(1);
});

/**
 * PM2 Configuration for Dutchie Product Discounts Sync
 *
 * This configuration runs the sync every 15 minutes using PM2's cron mode.
 *
 * Installation:
 *   npm install -g pm2
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 *
 * Management:
 *   pm2 status              - Check status
 *   pm2 logs dutchie-sync   - View logs
 *   pm2 restart dutchie-sync - Restart
 *   pm2 stop dutchie-sync   - Stop
 */

module.exports = {
  apps: [{
    name: 'dutchie-sync',
    script: 'npm',
    args: 'run sync',

    // Run every 15 minutes
    cron_restart: '*/15 * * * *',

    // Don't auto-restart (cron handles restarts)
    autorestart: false,

    // Don't watch for file changes
    watch: false,

    // Restart if memory exceeds 500MB
    max_memory_restart: '500M',

    // Logging
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    time: true,

    // Environment
    env: {
      NODE_ENV: 'production'
    },

    // Merge logs from different instances
    merge_logs: true,

    // Instance configuration
    instances: 1,
    exec_mode: 'fork'
  }]
};

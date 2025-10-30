# Deployment & Scheduling Guide

This guide covers multiple options for running the sync every 15 minutes in production.

## Option 1: Built-in Scheduler (Recommended for Simple Deployments)

The easiest option - the script has a built-in scheduler.

### Setup:

1. Edit `.env`:
   ```env
   SYNC_INTERVAL=15
   ```

2. Build and start:
   ```bash
   npm run build
   npm start
   ```

The process will run continuously, syncing every 15 minutes.

### Keep Running with PM2:

```bash
npm install -g pm2
pm2 start npm --name "dutchie-sync" -- start
pm2 save
pm2 startup
```

**Pros:**
- Simple setup
- Automatic retries on crash (with PM2)
- Logs managed by PM2

**Cons:**
- Needs process manager to keep running
- Uses continuous resources

---

## Option 2: PM2 with Cron Mode (Recommended for Production)

PM2 can run the script on a cron schedule instead of continuously.

### Setup:

1. Create `ecosystem.config.js`:
   ```javascript
   module.exports = {
     apps: [{
       name: 'dutchie-sync',
       script: 'npm',
       args: 'run sync',
       cron_restart: '*/15 * * * *',
       autorestart: false,
       watch: false,
       env: {
         NODE_ENV: 'production'
       }
     }]
   };
   ```

2. Start with PM2:
   ```bash
   npm install -g pm2
   npm run build
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

**Pros:**
- Runs only when needed (every 15 minutes)
- PM2 handles logging, monitoring, restarts
- Easy to manage with PM2 commands

**Cons:**
- Requires PM2 installation

### PM2 Management Commands:

```bash
pm2 status              # Check status
pm2 logs dutchie-sync   # View logs
pm2 restart dutchie-sync # Restart
pm2 stop dutchie-sync   # Stop
pm2 delete dutchie-sync # Remove
```

---

## Option 3: System Cron (Linux/Mac)

Use the system's cron scheduler.

### Setup:

1. Build the project:
   ```bash
   npm run build
   ```

2. Create a wrapper script `sync-wrapper.sh`:
   ```bash
   #!/bin/bash
   cd /path/to/dutchieproductdiscounts
   /usr/bin/node dist/index.js >> /var/log/dutchie-sync.log 2>&1
   ```

3. Make it executable:
   ```bash
   chmod +x sync-wrapper.sh
   ```

4. Edit crontab:
   ```bash
   crontab -e
   ```

5. Add this line (runs every 15 minutes):
   ```
   */15 * * * * /path/to/dutchieproductdiscounts/sync-wrapper.sh
   ```

**Important:** Do NOT set `SYNC_INTERVAL` in `.env` when using cron - the script will run once per execution.

**Pros:**
- Native to Linux/Mac
- No additional dependencies
- Runs only when needed

**Cons:**
- Requires shell script setup
- Manual log management

---

## Option 4: Windows Task Scheduler

For Windows servers.

### Setup:

1. Build the project:
   ```bash
   npm run build
   ```

2. Create `sync.bat`:
   ```batch
   @echo off
   cd C:\path\to\dutchieproductdiscounts
   node dist\index.js >> C:\logs\dutchie-sync.log 2>&1
   ```

3. Open Task Scheduler:
   - Press Win + R, type `taskschd.msc`

4. Create Basic Task:
   - Name: "Dutchie Sync"
   - Trigger: Daily
   - Repeat task every: 15 minutes
   - Duration: Indefinitely
   - Action: Start a program
   - Program: `C:\path\to\sync.bat`

**Important:** Do NOT set `SYNC_INTERVAL` in `.env` when using Task Scheduler.

**Pros:**
- Native to Windows
- GUI interface
- Built-in error handling

**Cons:**
- Windows only
- Manual setup

---

## Option 5: Docker with Cron

Run in a Docker container with cron.

### Setup:

1. Create `Dockerfile`:
   ```dockerfile
   FROM node:18-alpine

   # Install cron
   RUN apk add --no-cache dcron

   WORKDIR /app

   # Copy package files
   COPY package*.json ./
   RUN npm install --production

   # Copy source
   COPY . .
   RUN npm run build

   # Create cron job
   RUN echo "*/15 * * * * cd /app && node dist/index.js >> /var/log/cron.log 2>&1" > /etc/crontabs/root

   # Start cron
   CMD ["crond", "-f", "-l", "2"]
   ```

2. Create `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     dutchie-sync:
       build: .
       container_name: dutchie-sync
       restart: unless-stopped
       env_file:
         - .env
       volumes:
         - ./logs:/var/log
   ```

3. Build and run:
   ```bash
   docker-compose up -d
   ```

4. View logs:
   ```bash
   docker-compose logs -f
   ```

**Pros:**
- Containerized
- Isolated environment
- Easy deployment

**Cons:**
- Requires Docker knowledge
- Additional overhead

---

## Recommended Setup by Environment

### Development
Use built-in scheduler:
```env
SYNC_INTERVAL=15
```
```bash
npm run dev
```

### Production (Linux Server)
Use PM2 with cron mode:
```bash
pm2 start ecosystem.config.js
```

### Production (Windows Server)
Use Windows Task Scheduler with `sync.bat`

### Cloud/Container
Use Docker with cron

---

## Monitoring & Logging

### PM2 Logs
```bash
pm2 logs dutchie-sync --lines 100
pm2 flush  # Clear logs
```

### System Cron Logs (Linux)
```bash
tail -f /var/log/dutchie-sync.log
grep ERROR /var/log/dutchie-sync.log
```

### Windows Task Scheduler
- Check Task Scheduler History tab
- View log file at `C:\logs\dutchie-sync.log`

---

## Health Checks

Create a simple health check endpoint (optional):

1. Modify `src/index.ts` to track last sync time
2. Expose an HTTP endpoint showing sync status
3. Monitor with services like UptimeRobot, Pingdom, etc.

---

## Troubleshooting

### Sync not running
- Check process is running: `pm2 status` or `ps aux | grep node`
- Verify cron syntax: `crontab -l`
- Check logs for errors

### Memory issues
- Limit Node.js memory: `node --max-old-space-size=512 dist/index.js`
- Use PM2 max memory restart: `max_memory_restart: '300M'` in ecosystem config

### Multiple instances running
- Stop all: `pm2 delete all` or `killall node`
- Verify crontab doesn't have duplicates: `crontab -l`

---

## Performance Optimization

For large catalogs (1000+ products per store):

1. Increase pagination in Strapi queries
2. Use batching for API calls
3. Add connection pooling
4. Consider running sync per store (split jobs)

---

## Example Monitoring Setup

### Add to ecosystem.config.js:
```javascript
module.exports = {
  apps: [{
    name: 'dutchie-sync',
    script: 'npm',
    args: 'run sync',
    cron_restart: '*/15 * * * *',
    autorestart: false,
    max_memory_restart: '500M',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    time: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

### Monitor with PM2 Web:
```bash
pm2 install pm2-server-monit
```

Visit: http://your-server:9615

---

## Security Checklist

- [ ] `.env` file is not committed to Git
- [ ] Strapi API token has minimal required permissions
- [ ] Dutchie API keys are marked private in Strapi
- [ ] Logs don't contain sensitive data
- [ ] Process runs as non-root user (Linux)
- [ ] Firewall allows only necessary connections

---

## Next Steps

1. Choose your deployment method
2. Set up monitoring/alerting
3. Configure log rotation
4. Test failure scenarios
5. Document your specific setup for your team

# Dutchie Product Discounts Sync - Docker Image
#
# Build:
#   docker build -t dutchie-sync .
#
# Run with built-in scheduler (every 15 minutes):
#   docker run -d --env-file .env -e SYNC_INTERVAL=15 dutchie-sync
#
# Run with cron:
#   docker run -d --env-file .env dutchie-sync cron
#

FROM node:18-alpine

# Install cron (for cron mode)
RUN apk add --no-cache dcron

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Create logs directory
RUN mkdir -p /app/logs

# Create cron job file (runs every 15 minutes)
RUN echo "*/15 * * * * cd /app && node dist/index.js >> /app/logs/cron.log 2>&1" > /etc/crontabs/root

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD test -f /app/logs/sync.log || exit 1

# Default command (can be overridden)
CMD ["npm", "start"]

# Alternative: Use cron
# CMD ["crond", "-f", "-l", "2"]

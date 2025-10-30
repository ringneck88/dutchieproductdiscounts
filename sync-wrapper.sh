#!/bin/bash

#######################################
# Dutchie Sync Wrapper Script
#
# This script runs the Dutchie sync with proper error handling
# and logging. Use this with cron for scheduled execution.
#
# Cron example (every 15 minutes):
#   */15 * * * * /path/to/sync-wrapper.sh
#
# Make executable:
#   chmod +x sync-wrapper.sh
#######################################

# Change to script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Configuration
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/sync.log"
ERROR_LOG="$LOG_DIR/error.log"
NODE_BIN="/usr/bin/node"  # Adjust if needed
MAX_LOG_SIZE=10485760  # 10MB

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to rotate logs if they get too large
rotate_logs() {
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt $MAX_LOG_SIZE ]; then
        mv "$LOG_FILE" "$LOG_FILE.$(date +%Y%m%d-%H%M%S)"
        echo "Log rotated at $(date)" > "$LOG_FILE"
    fi
}

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Main execution
main() {
    log "==================================="
    log "Starting Dutchie sync"
    log "==================================="

    # Rotate logs if needed
    rotate_logs

    # Check if node is available
    if ! command -v "$NODE_BIN" &> /dev/null; then
        log "ERROR: Node.js not found at $NODE_BIN"
        exit 1
    fi

    # Check if .env exists
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        log "ERROR: .env file not found"
        exit 1
    fi

    # Run the sync
    log "Executing sync..."

    if "$NODE_BIN" "$SCRIPT_DIR/dist/index.js" >> "$LOG_FILE" 2>> "$ERROR_LOG"; then
        log "Sync completed successfully"
        exit 0
    else
        EXIT_CODE=$?
        log "ERROR: Sync failed with exit code $EXIT_CODE"
        log "Check $ERROR_LOG for details"
        exit $EXIT_CODE
    fi
}

# Run main function
main

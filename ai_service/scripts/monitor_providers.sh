#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}[*]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[x]${NC} $1"
}

# Change to the ai_service directory
cd "$(dirname "$0")/.." || exit 1

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to send notification (customize based on your needs)
send_notification() {
    local subject="$1"
    local message="$2"
    
    # Example: Send email if mail command is available
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL"
    fi
    
    # Log the notification
    echo "[$(date)] $subject: $message" >> logs/notifications.log
}

# Function to check provider status and handle alerts
check_providers() {
    print_status "Running provider status check..."
    
    # Run the status check
    ./scripts/check_provider_status.py
    local status=$?
    
    if [ $status -ne 0 ]; then
        # Read the latest status results
        if [ -f logs/provider_status.json ]; then
            # Count errors
            local error_count=$(grep -c '"status": "error"' logs/provider_status.json)
            
            if [ $error_count -gt 0 ]; then
                local subject="StockIt: $error_count provider(s) experiencing issues"
                local message="Provider status check detected issues. Check logs/provider_status.json for details."
                send_notification "$subject" "$message"
            fi
        fi
    fi
    
    return $status
}

# Function to analyze historical status
analyze_history() {
    print_status "Analyzing provider status history..."
    
    # Keep only last 7 days of status files
    find logs -name 'provider_status_*.json' -mtime +7 -delete
    
    # Archive current status with timestamp
    if [ -f logs/provider_status.json ]; then
        cp logs/provider_status.json "logs/provider_status_$(date +%Y%m%d_%H%M%S).json"
    fi
}

# Function to clean up old logs
cleanup_logs() {
    print_status "Cleaning up old logs..."
    
    # Remove logs older than 30 days
    find logs -name '*.log' -mtime +30 -delete
    
    # Compress logs older than 7 days
    find logs -name '*.log' -mtime +7 -not -name '*.gz' -exec gzip {} \;
}

# Main monitoring loop
main() {
    print_status "Starting provider monitoring..."
    
    while true; do
        # Run provider check
        check_providers
        
        # Analyze historical data
        analyze_history
        
        # Clean up old logs
        cleanup_logs
        
        # Wait for next check (5 minutes)
        sleep 300
    done
}

# Handle script termination
cleanup() {
    print_status "Stopping provider monitoring..."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start monitoring
if [ "$1" = "--daemon" ]; then
    # Run in background
    main > logs/monitor.log 2>&1 &
    echo $! > logs/monitor.pid
    print_status "Monitoring daemon started (PID: $(cat logs/monitor.pid))"
else
    # Run in foreground
    main
fi
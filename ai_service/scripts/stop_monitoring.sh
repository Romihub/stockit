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

# Check if PID file exists
if [ ! -f logs/monitor.pid ]; then
    print_error "Monitoring daemon is not running (PID file not found)"
    exit 1
fi

# Read PID
pid=$(cat logs/monitor.pid)

# Check if process is running
if ! ps -p "$pid" > /dev/null; then
    print_warning "Process $pid is not running"
    rm -f logs/monitor.pid
    exit 1
fi

# Stop the process
print_status "Stopping monitoring daemon (PID: $pid)..."
kill "$pid"

# Wait for process to stop
count=0
while ps -p "$pid" > /dev/null; do
    sleep 1
    count=$((count + 1))
    if [ $count -ge 10 ]; then
        print_warning "Process is not responding, forcing stop..."
        kill -9 "$pid"
        break
    fi
done

# Remove PID file
rm -f logs/monitor.pid

# Final status
if ! ps -p "$pid" > /dev/null; then
    print_status "Monitoring daemon stopped successfully"
    
    # Save final status
    if [ -f logs/provider_status.json ]; then
        timestamp=$(date +%Y%m%d_%H%M%S)
        mv logs/provider_status.json "logs/provider_status_final_$timestamp.json"
        print_status "Final status saved to logs/provider_status_final_$timestamp.json"
    fi
    
    exit 0
else
    print_error "Failed to stop monitoring daemon"
    exit 1
fi
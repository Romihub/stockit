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

# Function to check if monitoring is running
check_monitoring() {
    if [ -f logs/monitor.pid ]; then
        pid=$(cat logs/monitor.pid)
        if ps -p "$pid" > /dev/null; then
            return 0
        fi
    fi
    return 1
}

# Function to restart monitoring if needed
restart_monitoring() {
    print_status "Checking monitoring daemon..."
    
    if ! check_monitoring; then
        print_warning "Monitoring daemon not running, restarting..."
        ./scripts/monitor_providers.sh --daemon
        sleep 2
        
        if check_monitoring; then
            print_status "Monitoring daemon restarted successfully"
        else
            print_error "Failed to restart monitoring daemon"
            return 1
        fi
    else
        print_status "Monitoring daemon is running"
    fi
}

# Function to check disk space
check_disk_space() {
    print_status "Checking disk space..."
    
    # Get total size of logs and models
    logs_size=$(du -sh logs 2>/dev/null | cut -f1)
    models_size=$(du -sh models 2>/dev/null | cut -f1)
    
    print_status "Current disk usage:"
    echo "Logs: $logs_size"
    echo "Models: $models_size"
    
    # Check if cleanup is needed
    if [ -d logs ] && [ "$(find logs -type f -size +100M 2>/dev/null)" ]; then
        print_warning "Large log files found, running cleanup..."
        ./scripts/cleanup_logs.py
    fi
}

# Function to check API keys
check_api_keys() {
    print_status "Checking API keys..."
    ./scripts/test_api_keys.py
    
    if [ $? -ne 0 ]; then
        print_warning "Some API keys need attention"
        print_warning "Run './scripts/update_all_keys.sh' to update keys"
    fi
}

# Function to generate reports
generate_reports() {
    print_status "Generating system reports..."
    
    # Generate system report
    ./scripts/generate_system_report.py
    
    # Check provider status
    ./scripts/check_provider_status.py
    
    # Archive old reports
    find logs -name '*_report_*.json' -mtime +7 -exec gzip {} \;
}

# Main maintenance function
main() {
    print_status "Starting daily maintenance tasks..."
    echo "----------------------------------------"
    
    # Create timestamp for logs
    timestamp=$(date +%Y%m%d_%H%M%S)
    log_file="logs/maintenance_${timestamp}.log"
    
    # Redirect all output to log file while still showing on screen
    exec > >(tee -a "$log_file") 2>&1
    
    # Run maintenance tasks
    restart_monitoring
    check_disk_space
    check_api_keys
    generate_reports
    
    # Print summary
    echo -e "\nMaintenance Summary:"
    echo "----------------------------------------"
    echo "✓ Monitoring status checked"
    echo "✓ Disk space verified"
    echo "✓ API keys tested"
    echo "✓ System reports generated"
    echo "✓ Log file: $log_file"
    
    print_status "Daily maintenance completed"
}

# Handle script termination
cleanup() {
    print_status "Maintenance interrupted, cleaning up..."
    exit 1
}

trap cleanup SIGINT SIGTERM

# Parse command line arguments
case "$1" in
    --quiet)
        # Run without output
        main > /dev/null 2>&1
        ;;
    --help)
        echo "Usage: $0 [--quiet|--help]"
        echo "  --quiet  Run maintenance without output"
        echo "  --help   Show this help message"
        exit 0
        ;;
    *)
        # Run with normal output
        main
        ;;
esac
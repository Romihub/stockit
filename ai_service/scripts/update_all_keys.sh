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

# Create backup of current .env
timestamp=$(date +%Y%m%d_%H%M%S)
if [ -f .env ]; then
    print_status "Creating backup of current .env file..."
    cp .env ".env.backup_${timestamp}"
fi

# Run setup script
print_status "Running API key setup..."
./scripts/setup_api_keys.py

# Check if setup was successful
if [ $? -ne 0 ]; then
    print_error "API key setup failed"
    print_status "Restoring backup..."
    if [ -f ".env.backup_${timestamp}" ]; then
        cp ".env.backup_${timestamp}" .env
    fi
    exit 1
fi

# Test the new keys
print_status "Testing new API keys..."
./scripts/test_api_keys.py

# Check test results
if [ $? -ne 0 ]; then
    print_warning "Some API keys failed validation"
    print_warning "Check logs/api_test_results.json for details"
    
    read -p "Would you like to restore the previous configuration? (y/N) " restore
    if [[ $restore =~ ^[Yy]$ ]]; then
        print_status "Restoring backup..."
        if [ -f ".env.backup_${timestamp}" ]; then
            cp ".env.backup_${timestamp}" .env
            print_status "Previous configuration restored"
        else
            print_error "Backup file not found"
        fi
    fi
else
    print_status "All API keys validated successfully"
fi

# Clean up old backups (keep last 5)
print_status "Cleaning up old backups..."
ls -t .env.backup_* 2>/dev/null | tail -n +6 | xargs -r rm

# Run cleanup script to archive old test results
print_status "Running cleanup script..."
./scripts/cleanup_logs.py

print_status "Update process completed"

# Print summary
echo -e "\nSummary:"
echo "----------------------------------------"
echo "✓ API keys updated"
echo "✓ Backup created: .env.backup_${timestamp}"
echo "✓ Keys tested"
echo "✓ Old backups cleaned"
echo "✓ Logs archived"
echo "----------------------------------------"

# Provide next steps
echo -e "\nNext steps:"
echo "1. Review logs/api_test_results.json for any issues"
echo "2. Run ./run_service.sh to restart the service"
echo "3. Check the dashboard for data provider status"
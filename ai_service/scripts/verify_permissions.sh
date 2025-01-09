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

# List of scripts that should be executable
SCRIPTS=(
    "scripts/setup_api_keys.py"
    "scripts/test_api_keys.py"
    "scripts/verify_setup.py"
    "scripts/cleanup_logs.py"
    "scripts/update_all_keys.sh"
    "scripts/check_provider_status.py"
    "scripts/monitor_providers.sh"
    "scripts/stop_monitoring.sh"
    "scripts/analyze_provider_history.py"
    "scripts/generate_system_report.py"
    "scripts/daily_maintenance.sh"
    "scripts/check_maintenance.py"
    "scripts/verify_permissions.sh"
    "run_service.sh"
)

# Function to check script permissions
check_permissions() {
    local script=$1
    if [ ! -f "$script" ]; then
        print_error "Script not found: $script"
        return 1
    fi
    
    if [ ! -x "$script" ]; then
        print_error "Script not executable: $script"
        return 1
    fi
    
    print_status "Script permissions OK: $script"
    return 0
}

# Function to fix script permissions
fix_permissions() {
    local script=$1
    if [ -f "$script" ]; then
        chmod +x "$script"
        print_status "Fixed permissions for: $script"
    else
        print_error "Cannot fix permissions, script not found: $script"
    fi
}

# Main function
main() {
    print_status "Checking script permissions..."
    echo "----------------------------------------"
    
    errors=0
    for script in "${SCRIPTS[@]}"; do
        if ! check_permissions "$script"; then
            errors=$((errors + 1))
        fi
    done
    
    if [ $errors -gt 0 ]; then
        echo
        print_warning "Found $errors script(s) with incorrect permissions"
        read -p "Would you like to fix permissions? (y/N) " fix
        if [[ $fix =~ ^[Yy]$ ]]; then
            echo
            print_status "Fixing permissions..."
            for script in "${SCRIPTS[@]}"; do
                if [ ! -x "$script" ]; then
                    fix_permissions "$script"
                fi
            done
            
            # Verify fixes
            echo
            print_status "Verifying fixes..."
            errors=0
            for script in "${SCRIPTS[@]}"; do
                if ! check_permissions "$script"; then
                    errors=$((errors + 1))
                fi
            done
            
            if [ $errors -eq 0 ]; then
                echo
                print_status "All permissions fixed successfully"
                exit 0
            else
                echo
                print_error "Some permissions could not be fixed"
                exit 1
            fi
        else
            echo
            print_warning "No changes made"
            exit 1
        fi
    else
        echo
        print_status "All script permissions are correct"
        exit 0
    fi
}

# Run main function
main
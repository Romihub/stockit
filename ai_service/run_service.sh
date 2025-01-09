#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

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

# Check Python version
if ! command_exists python3; then
    print_error "Python 3 is not installed"
    exit 1
fi

# Check if Redis is running
if command_exists redis-cli; then
    if ! redis-cli ping > /dev/null 2>&1; then
        print_warning "Redis is not running. Starting Redis..."
        redis-server --daemonize yes
    else
        print_status "Redis is running"
    fi
else
    print_warning "Redis is not installed. Caching will be disabled"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs models data

# Check and create Python virtual environment
if [ ! -d "venv" ]; then
    print_status "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Install requirements
print_status "Installing requirements..."
pip install -r requirements.txt

# Check for CUDA availability
if python3 -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"; then
    print_status "GPU support is available"
else
    print_warning "No GPU support detected. Using CPU only"
fi

# Initialize monitoring
print_status "Initializing monitoring..."
if [ ! -f "logs/ai_service.log" ]; then
    touch logs/ai_service.log
fi

# Check if models directory has test data
if [ ! -f "models/test_summary.json" ]; then
    print_status "Running initial model tests..."
    python scripts/test_model.py
fi

# Start the service
print_status "Starting AI service..."
if [ "$1" == "--dev" ]; then
    print_status "Running in development mode..."
    export AI_SERVICE_ENV=development
    uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
else
    export AI_SERVICE_ENV=production
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 4
fi

# Cleanup function
cleanup() {
    print_status "Shutting down AI service..."
    deactivate
    if command_exists redis-cli; then
        redis-cli shutdown
    fi
    exit 0
}

# Register cleanup function
trap cleanup SIGINT SIGTERM

# Keep script running
wait
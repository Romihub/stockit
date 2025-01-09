#!/usr/bin/env python3
import os
from pathlib import Path
import logging
import json
from typing import Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Data provider information
PROVIDERS = {
    "Market Data": {
        "ALPHA_VANTAGE_API_KEY": {
            "name": "Alpha Vantage",
            "url": "https://www.alphavantage.co/support/#api-key",
            "description": "Market data and technical indicators"
        },
        "NEWS_API_KEY": {
            "name": "News API",
            "url": "https://newsapi.org/register",
            "description": "Market news and updates"
        },
        "FINNHUB_API_KEY": {
            "name": "Finnhub",
            "url": "https://finnhub.io/register",
            "description": "Real-time market data and sentiment"
        }
    },
    "Real-time Data": {
        "POLYGON_API_KEY": {
            "name": "Polygon.io",
            "url": "https://polygon.io/dashboard/signup",
            "description": "Primary real-time market data"
        },
        "TIINGO_API_KEY": {
            "name": "Tiingo",
            "url": "https://api.tiingo.com/account/signup",
            "description": "Historical and real-time data"
        },
        "MARKETSTACK_API_KEY": {
            "name": "Marketstack",
            "url": "https://marketstack.com/signup",
            "description": "Global market coverage"
        },
        "TWELVE_DATA_API_KEY": {
            "name": "Twelve Data",
            "url": "https://twelvedata.com/signup",
            "description": "Alternative real-time source"
        },
        "TRADIER_API_KEY": {
            "name": "Tradier",
            "url": "https://developer.tradier.com/user/sign_up",
            "description": "Options data and market status"
        }
    },
    "Insider Trading": {
        "TRADEFEEDS_API_KEY": {
            "name": "Tradefeeds",
            "url": "https://tradefeeds.com/api-documentation",
            "description": "Primary insider trading data"
        },
        "OPENINSIDER_API_KEY": {
            "name": "OpenInsider",
            "url": "https://www.openinsider.com/api",
            "description": "Additional insider trading insights"
        },
        "SEC_EDGAR_API_KEY": {
            "name": "SEC EDGAR",
            "url": "https://www.sec.gov/edgar/sec-api-documentation",
            "description": "Direct SEC filings access"
        },
        "BENZINGA_API_KEY": {
            "name": "Benzinga",
            "url": "https://www.benzinga.com/apis",
            "description": "Institutional holdings data"
        }
    }
}

def load_existing_keys() -> Dict[str, str]:
    """Load existing API keys from .env file"""
    env_path = Path(__file__).parent.parent / '.env'
    if not env_path.exists():
        return {}
    
    keys = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                key, value = line.split('=', 1)
                if '_API_KEY' in key:
                    keys[key] = value
    return keys

def save_keys(keys: Dict[str, str]) -> None:
    """Save API keys to .env file"""
    env_path = Path(__file__).parent.parent / '.env'
    if not env_path.exists():
        logger.error(".env file not found")
        return
    
    # Read existing content
    with open(env_path) as f:
        lines = f.readlines()
    
    # Update keys
    updated_lines = []
    for line in lines:
        if '=' in line and not line.startswith('#'):
            key = line.split('=', 1)[0].strip()
            if key in keys:
                updated_lines.append(f"{key}={keys[key]}\n")
                continue
        updated_lines.append(line)
    
    # Write back to file
    with open(env_path, 'w') as f:
        f.writelines(updated_lines)

def save_key_info(key: str, value: str) -> None:
    """Save API key information to secure storage"""
    keys_dir = Path(__file__).parent.parent / '.keys'
    keys_dir.mkdir(exist_ok=True)
    
    key_file = keys_dir / 'api_keys.json'
    existing_data = {}
    if key_file.exists():
        with open(key_file) as f:
            existing_data = json.load(f)
    
    existing_data[key] = {
        "last_updated": str(datetime.now()),
        "status": "active"
    }
    
    with open(key_file, 'w') as f:
        json.dump(existing_data, f, indent=2)

def get_user_input(prompt: str, default: Optional[str] = None) -> str:
    """Get user input with optional default value"""
    if default:
        prompt = f"{prompt} [{default}]: "
    else:
        prompt = f"{prompt}: "
    
    value = input(prompt).strip()
    return value if value else default

def main():
    """Main setup function"""
    print("\nStockIt AI Service - API Key Setup\n")
    print("This script will help you configure API keys for data providers.\n")
    
    existing_keys = load_existing_keys()
    updated_keys = existing_keys.copy()
    
    for category, providers in PROVIDERS.items():
        print(f"\n{category}:")
        print("-" * 50)
        
        for key, info in providers.items():
            print(f"\n{info['name']}:")
            print(f"Description: {info['description']}")
            print(f"Signup URL: {info['url']}")
            
            existing = existing_keys.get(key, 'not set')
            if existing != 'not set':
                print(f"Current value: {'*' * len(existing)}")
            
            if get_user_input(f"Update {info['name']} API key? (y/N)").lower() != 'y':
                continue
            
            new_value = get_user_input("Enter API key")
            if new_value:
                updated_keys[key] = new_value
                save_key_info(key, new_value)
                print(f"✓ {info['name']} API key updated")
            else:
                print(f"✗ {info['name']} API key unchanged")
    
    if updated_keys != existing_keys:
        save_keys(updated_keys)
        print("\n✓ API keys have been updated in .env file")
    else:
        print("\nNo changes were made to API keys")
    
    print("\nSetup complete!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nSetup cancelled by user")
        exit(1)
    except Exception as e:
        logger.error(f"Setup failed: {str(e)}")
        exit(1)
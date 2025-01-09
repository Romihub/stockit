#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import logging
import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Add parent directory to path for imports
parent_dir = str(Path(__file__).parent.parent)
sys.path.append(parent_dir)

from config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Test endpoints for each provider
API_ENDPOINTS = {
    "Market Data": {
        "ALPHA_VANTAGE_API_KEY": {
            "url": "https://www.alphavantage.co/query",
            "params": {
                "function": "TIME_SERIES_INTRADAY",
                "symbol": "AAPL",
                "interval": "5min",
                "apikey": "{key}"
            },
            "success_check": lambda r: "Time Series" in r
        },
        "FINNHUB_API_KEY": {
            "url": "https://finnhub.io/api/v1/quote",
            "params": {
                "symbol": "AAPL",
                "token": "{key}"
            },
            "success_check": lambda r: "c" in r
        }
    },
    "Real-time Data": {
        "POLYGON_API_KEY": {
            "url": "https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2024-01-01/2024-01-07",
            "params": {
                "apiKey": "{key}"
            },
            "success_check": lambda r: "results" in r
        },
        "TIINGO_API_KEY": {
            "url": "https://api.tiingo.com/tiingo/daily/AAPL/prices",
            "headers": {
                "Authorization": "Token {key}"
            },
            "success_check": lambda r: isinstance(r, list) and len(r) > 0
        },
        "MARKETSTACK_API_KEY": {
            "url": "http://api.marketstack.com/v1/eod",
            "params": {
                "access_key": "{key}",
                "symbols": "AAPL"
            },
            "success_check": lambda r: "data" in r
        },
        "TWELVE_DATA_API_KEY": {
            "url": "https://api.twelvedata.com/time_series",
            "params": {
                "symbol": "AAPL",
                "interval": "1day",
                "apikey": "{key}"
            },
            "success_check": lambda r: "values" in r
        }
    },
    "Insider Trading": {
        "TRADEFEEDS_API_KEY": {
            "url": "https://api.tradefeeds.com/v1/insider-trades",
            "params": {
                "api_key": "{key}",
                "symbol": "AAPL"
            },
            "success_check": lambda r: "data" in r
        },
        "SEC_EDGAR_API_KEY": {
            "url": "https://api.sec-api.io",
            "params": {
                "token": "{key}",
                "query": {"query": {"query_string": {"query": "AAPL"}}}
            },
            "success_check": lambda r: "filings" in r
        },
        "BENZINGA_API_KEY": {
            "url": "https://api.benzinga.com/api/v2/insider-trades",
            "params": {
                "token": "{key}",
                "symbols": "AAPL"
            },
            "success_check": lambda r: "insider_trades" in r
        }
    }
}

async def test_endpoint(
    session: aiohttp.ClientSession,
    provider: str,
    key: str,
    config: Dict
) -> Dict:
    """Test an API endpoint with the provided key"""
    try:
        url = config["url"]
        headers = config.get("headers", {})
        params = config.get("params", {})
        
        # Format headers and params with API key
        headers = {k: v.format(key=key) for k, v in headers.items()}
        params = {k: v.format(key=key) for k, v in params.items()}
        
        async with session.get(url, headers=headers, params=params) as response:
            if response.status != 200:
                return {
                    "provider": provider,
                    "status": "error",
                    "message": f"HTTP {response.status}: {await response.text()}"
                }
            
            data = await response.json()
            success = config["success_check"](data)
            
            return {
                "provider": provider,
                "status": "success" if success else "error",
                "message": "API response valid" if success else "Invalid response format"
            }
            
    except Exception as e:
        return {
            "provider": provider,
            "status": "error",
            "message": str(e)
        }

async def test_all_keys() -> List[Dict]:
    """Test all configured API keys"""
    results = []
    
    # Load API keys from environment
    env_keys = {
        key: os.getenv(key)
        for category in API_ENDPOINTS.values()
        for key in category.keys()
    }
    
    async with aiohttp.ClientSession() as session:
        for category, providers in API_ENDPOINTS.items():
            print(f"\nTesting {category} providers:")
            print("-" * 50)
            
            for key_name, endpoint_config in providers.items():
                key_value = env_keys.get(key_name)
                if not key_value or key_value.startswith('your_'):
                    results.append({
                        "provider": key_name,
                        "status": "skipped",
                        "message": "API key not configured"
                    })
                    print(f"⚠️  {key_name}: Not configured")
                    continue
                
                result = await test_endpoint(session, key_name, key_value, endpoint_config)
                results.append(result)
                
                status_icon = "✓" if result["status"] == "success" else "✗"
                print(f"{status_icon} {key_name}: {result['message']}")
    
    return results

def save_results(results: List[Dict]) -> None:
    """Save test results to file"""
    output = {
        "timestamp": datetime.now().isoformat(),
        "results": results,
        "summary": {
            "total": len(results),
            "success": len([r for r in results if r["status"] == "success"]),
            "error": len([r for r in results if r["status"] == "error"]),
            "skipped": len([r for r in results if r["status"] == "skipped"])
        }
    }
    
    results_file = Path(parent_dir) / 'logs' / 'api_test_results.json'
    with open(results_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    logger.info(f"Test results saved to {results_file}")

async def main():
    """Main test function"""
    print("\nTesting API Key Configurations")
    print("=" * 50)
    
    results = await test_all_keys()
    save_results(results)
    
    # Print summary
    success = len([r for r in results if r["status"] == "success"])
    error = len([r for r in results if r["status"] == "error"])
    skipped = len([r for r in results if r["status"] == "skipped"])
    
    print("\nTest Summary")
    print("-" * 50)
    print(f"Total Providers: {len(results)}")
    print(f"✓ Successful: {success}")
    print(f"✗ Failed: {error}")
    print(f"⚠️  Skipped: {skipped}")
    
    # Exit with appropriate status code
    if error > 0:
        print("\n⚠️  Some API keys failed validation. Check logs for details.")
        sys.exit(1)
    elif skipped == len(results):
        print("\n⚠️  No API keys configured. Run setup_api_keys.py first.")
        sys.exit(1)
    else:
        print("\n✓ All configured API keys are working correctly.")
        sys.exit(0)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nTest cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        sys.exit(1)
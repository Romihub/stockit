#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import logging
import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, List
import time

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

# Status endpoints for each provider
STATUS_ENDPOINTS = {
    "Market Data": {
        "Alpha Vantage": {
            "url": "https://www.alphavantage.co/query",
            "params": {"function": "TIME_SERIES_INTRADAY", "symbol": "IBM", "interval": "1min"},
            "key_param": "apikey"
        },
        "Finnhub": {
            "url": "https://finnhub.io/api/v1/quote",
            "params": {"symbol": "AAPL"},
            "key_param": "token"
        }
    },
    "Real-time Data": {
        "Polygon.io": {
            "url": "https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2024-01-01/2024-01-07",
            "params": {},
            "key_param": "apiKey"
        },
        "Tiingo": {
            "url": "https://api.tiingo.com/tiingo/daily/AAPL/prices",
            "headers": {"Authorization": "Token {key}"}
        },
        "Marketstack": {
            "url": "http://api.marketstack.com/v1/eod",
            "params": {"symbols": "AAPL"},
            "key_param": "access_key"
        },
        "Twelve Data": {
            "url": "https://api.twelvedata.com/time_series",
            "params": {"symbol": "AAPL", "interval": "1day"},
            "key_param": "apikey"
        }
    }
}

async def check_endpoint(
    session: aiohttp.ClientSession,
    provider: str,
    key: str,
    config: Dict
) -> Dict:
    """Check a provider's endpoint status"""
    start_time = time.time()
    try:
        url = config["url"]
        headers = config.get("headers", {})
        params = config.get("params", {}).copy()
        
        # Add API key to params or headers
        if "key_param" in config:
            params[config["key_param"]] = key
        else:
            headers = {k: v.format(key=key) for k, v in headers.items()}
        
        async with session.get(url, headers=headers, params=params) as response:
            elapsed = time.time() - start_time
            
            status = {
                "provider": provider,
                "status": "operational" if response.status == 200 else "error",
                "response_time": round(elapsed * 1000, 2),  # Convert to milliseconds
                "status_code": response.status
            }
            
            if response.status == 200:
                try:
                    data = await response.json()
                    status["rate_limit_remaining"] = response.headers.get(
                        "X-RateLimit-Remaining",
                        response.headers.get("RateLimit-Remaining", "N/A")
                    )
                except json.JSONDecodeError:
                    status["status"] = "error"
                    status["message"] = "Invalid JSON response"
            else:
                status["message"] = await response.text()
            
            return status
            
    except Exception as e:
        return {
            "provider": provider,
            "status": "error",
            "message": str(e),
            "response_time": round((time.time() - start_time) * 1000, 2)
        }

async def check_all_providers() -> Dict[str, List[Dict]]:
    """Check status of all configured providers"""
    results = {}
    
    # Load API keys from environment
    env_keys = {
        provider: os.getenv(f"{provider.upper().replace('.', '')}_API_KEY")
        for category in STATUS_ENDPOINTS.values()
        for provider in category.keys()
    }
    
    async with aiohttp.ClientSession() as session:
        for category, providers in STATUS_ENDPOINTS.items():
            print(f"\nChecking {category} providers:")
            print("-" * 50)
            
            category_results = []
            for provider, endpoint_config in providers.items():
                key = env_keys.get(provider)
                if not key or key.startswith('your_'):
                    status = {
                        "provider": provider,
                        "status": "not_configured",
                        "message": "API key not configured"
                    }
                    print(f"⚠️  {provider:20} Not configured")
                else:
                    status = await check_endpoint(session, provider, key, endpoint_config)
                    icon = "✓" if status["status"] == "operational" else "✗"
                    message = (
                        f"{status.get('response_time', 'N/A')}ms, "
                        f"Rate limit: {status.get('rate_limit_remaining', 'N/A')}"
                        if status["status"] == "operational"
                        else status.get("message", "Unknown error")
                    )
                    print(f"{icon} {provider:20} {message}")
                
                category_results.append(status)
            
            results[category] = category_results
    
    return results

def save_results(results: Dict) -> None:
    """Save status check results to file"""
    output = {
        "timestamp": datetime.now().isoformat(),
        "results": results,
        "summary": {
            category: {
                "total": len(providers),
                "operational": len([p for p in providers if p["status"] == "operational"]),
                "error": len([p for p in providers if p["status"] == "error"]),
                "not_configured": len([p for p in providers if p["status"] == "not_configured"])
            }
            for category, providers in results.items()
        }
    }
    
    results_file = Path(parent_dir) / 'logs' / 'provider_status.json'
    with open(results_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    logger.info(f"Status results saved to {results_file}")

async def main():
    """Main status check function"""
    print("\nChecking Data Provider Status")
    print("=" * 50)
    
    try:
        results = await check_all_providers()
        save_results(results)
        
        # Print summary
        print("\nStatus Summary")
        print("-" * 50)
        for category, providers in results.items():
            operational = len([p for p in providers if p["status"] == "operational"])
            error = len([p for p in providers if p["status"] == "error"])
            not_configured = len([p for p in providers if p["status"] == "not_configured"])
            
            print(f"\n{category}:")
            print(f"✓ Operational: {operational}")
            print(f"✗ Error: {error}")
            print(f"⚠️  Not Configured: {not_configured}")
        
        # Exit with appropriate status code
        if any(
            any(p["status"] == "error" for p in providers)
            for providers in results.values()
        ):
            print("\n⚠️  Some providers are experiencing issues. Check logs for details.")
            sys.exit(1)
        else:
            print("\n✓ All configured providers are operational.")
            sys.exit(0)
    
    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStatus check cancelled by user")
        sys.exit(1)
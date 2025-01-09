#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import logging
import json
from datetime import datetime, timedelta
import subprocess
from typing import Dict, List, Optional
import psutil

# Add parent directory to path for imports
parent_dir = str(Path(__file__).parent.parent)
sys.path.append(parent_dir)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_monitoring_status() -> Dict:
    """Check if monitoring daemon is running"""
    pid_file = Path(parent_dir) / 'logs' / 'monitor.pid'
    if not pid_file.exists():
        return {
            "status": "stopped",
            "message": "Monitoring daemon is not running"
        }
    
    try:
        with open(pid_file) as f:
            pid = int(f.read().strip())
        
        process = psutil.Process(pid)
        return {
            "status": "running",
            "pid": pid,
            "uptime": str(timedelta(seconds=int(time.time() - process.create_time()))),
            "memory_usage": f"{process.memory_info().rss / 1024 / 1024:.1f}MB",
            "cpu_percent": process.cpu_percent()
        }
    except (ProcessLookupError, psutil.NoSuchProcess):
        return {
            "status": "error",
            "message": f"Process {pid} not found (stale PID file)"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

def load_provider_status() -> Optional[Dict]:
    """Load latest provider status"""
    status_file = Path(parent_dir) / 'logs' / 'provider_status.json'
    if not status_file.exists():
        return None
    
    try:
        with open(status_file) as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading provider status: {str(e)}")
        return None

def load_api_keys() -> Dict:
    """Load API key information"""
    env_file = Path(parent_dir) / '.env'
    if not env_file.exists():
        return {}
    
    keys = {}
    try:
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if '=' in line and '_API_KEY' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    keys[key] = 'configured' if value and not value.startswith('your_') else 'not_configured'
    except Exception as e:
        logger.error(f"Error loading API keys: {str(e)}")
    
    return keys

def check_disk_space() -> Dict:
    """Check disk space usage"""
    logs_dir = Path(parent_dir) / 'logs'
    models_dir = Path(parent_dir) / 'models'
    
    try:
        logs_usage = sum(f.stat().st_size for f in logs_dir.glob('**/*') if f.is_file())
        models_usage = sum(f.stat().st_size for f in models_dir.glob('**/*') if f.is_file())
        
        return {
            "logs_size": f"{logs_usage / 1024 / 1024:.1f}MB",
            "models_size": f"{models_usage / 1024 / 1024:.1f}MB",
            "total_size": f"{(logs_usage + models_usage) / 1024 / 1024:.1f}MB"
        }
    except Exception as e:
        return {
            "error": str(e)
        }

def generate_report() -> Dict:
    """Generate comprehensive system report"""
    report = {
        "timestamp": datetime.now().isoformat(),
        "monitoring": check_monitoring_status(),
        "api_keys": load_api_keys(),
        "disk_usage": check_disk_space()
    }
    
    # Add provider status if available
    provider_status = load_provider_status()
    if provider_status:
        report["providers"] = provider_status
    
    return report

def print_report(report: Dict) -> None:
    """Print formatted report"""
    print("\nSystem Status Report")
    print("=" * 60)
    
    # Monitoring Status
    print("\nMonitoring Status:")
    print("-" * 60)
    monitoring = report["monitoring"]
    if monitoring["status"] == "running":
        print(f"Status: Running (PID: {monitoring['pid']})")
        print(f"Uptime: {monitoring['uptime']}")
        print(f"Memory Usage: {monitoring['memory_usage']}")
        print(f"CPU Usage: {monitoring['cpu_percent']}%")
    else:
        print(f"Status: {monitoring['status']}")
        print(f"Message: {monitoring['message']}")
    
    # API Keys
    print("\nAPI Keys:")
    print("-" * 60)
    for key, status in report["api_keys"].items():
        icon = "✓" if status == "configured" else "✗"
        print(f"{icon} {key}: {status}")
    
    # Disk Usage
    print("\nDisk Usage:")
    print("-" * 60)
    disk = report["disk_usage"]
    if "error" in disk:
        print(f"Error checking disk usage: {disk['error']}")
    else:
        print(f"Logs Directory: {disk['logs_size']}")
        print(f"Models Directory: {disk['models_size']}")
        print(f"Total Size: {disk['total_size']}")
    
    # Provider Status
    if "providers" in report:
        print("\nProvider Status:")
        print("-" * 60)
        for category, providers in report["providers"]["results"].items():
            print(f"\n{category}:")
            for provider in providers:
                icon = "✓" if provider["status"] == "operational" else "✗"
                status = (
                    f"{provider.get('response_time', 'N/A')}ms, "
                    f"Rate limit: {provider.get('rate_limit_remaining', 'N/A')}"
                    if provider["status"] == "operational"
                    else provider.get("message", "Unknown error")
                )
                print(f"{icon} {provider['provider']:20} {status}")

def save_report(report: Dict) -> None:
    """Save report to file"""
    report_file = Path(parent_dir) / 'logs' / 'system_report.json'
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"Report saved to {report_file}")

def main():
    """Main report generation function"""
    try:
        report = generate_report()
        print_report(report)
        save_report(report)
        sys.exit(0)
    except Exception as e:
        logger.error(f"Report generation failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nReport generation cancelled by user")
        sys.exit(1)
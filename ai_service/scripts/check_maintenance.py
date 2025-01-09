#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import logging
import json
from datetime import datetime, timedelta
import subprocess
from typing import Dict, List
import psutil
import re

# Add parent directory to path for imports
parent_dir = str(Path(__file__).parent.parent)
sys.path.append(parent_dir)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_cron_jobs() -> Dict:
    """Check maintenance cron jobs"""
    try:
        result = subprocess.run(
            ['crontab', '-l'],
            capture_output=True,
            text=True
        )
        cron_output = result.stdout
        
        maintenance_jobs = []
        for line in cron_output.splitlines():
            if 'daily_maintenance.sh' in line:
                schedule = line.split()[:5]
                schedule_str = ' '.join(schedule)
                maintenance_jobs.append({
                    'schedule': schedule_str,
                    'command': line.split('#')[0].strip(),
                    'comment': line.split('#')[1].strip() if '#' in line else None
                })
        
        return {
            'configured': bool(maintenance_jobs),
            'jobs': maintenance_jobs
        }
    except Exception as e:
        return {
            'configured': False,
            'error': str(e)
        }

def check_last_maintenance() -> Dict:
    """Check when maintenance was last run"""
    logs_dir = Path(parent_dir) / 'logs'
    if not logs_dir.exists():
        return {'error': 'Logs directory not found'}
    
    try:
        # Find latest maintenance log
        maintenance_logs = list(logs_dir.glob('maintenance_*.log'))
        if not maintenance_logs:
            return {'error': 'No maintenance logs found'}
        
        latest_log = max(maintenance_logs, key=lambda p: p.stat().st_mtime)
        last_run = datetime.fromtimestamp(latest_log.stat().st_mtime)
        
        # Check if maintenance completed successfully
        with open(latest_log) as f:
            content = f.read()
            success = 'Daily maintenance completed' in content
        
        return {
            'last_run': last_run.isoformat(),
            'success': success,
            'log_file': str(latest_log.name),
            'age_hours': (datetime.now() - last_run).total_seconds() / 3600
        }
    except Exception as e:
        return {'error': str(e)}

def check_monitoring_daemon() -> Dict:
    """Check monitoring daemon status"""
    pid_file = Path(parent_dir) / 'logs' / 'monitor.pid'
    if not pid_file.exists():
        return {
            'running': False,
            'message': 'PID file not found'
        }
    
    try:
        with open(pid_file) as f:
            pid = int(f.read().strip())
        
        process = psutil.Process(pid)
        return {
            'running': True,
            'pid': pid,
            'uptime': str(timedelta(seconds=int(datetime.now().timestamp() - process.create_time()))),
            'memory_mb': process.memory_info().rss / 1024 / 1024,
            'cpu_percent': process.cpu_percent()
        }
    except Exception as e:
        return {
            'running': False,
            'error': str(e)
        }

def check_disk_usage() -> Dict:
    """Check disk usage for logs and models"""
    logs_dir = Path(parent_dir) / 'logs'
    models_dir = Path(parent_dir) / 'models'
    
    try:
        logs_size = sum(f.stat().st_size for f in logs_dir.glob('**/*') if f.is_file())
        models_size = sum(f.stat().st_size for f in models_dir.glob('**/*') if f.is_file())
        
        return {
            'logs_mb': logs_size / 1024 / 1024,
            'models_mb': models_size / 1024 / 1024,
            'total_mb': (logs_size + models_size) / 1024 / 1024
        }
    except Exception as e:
        return {'error': str(e)}

def print_status(status: Dict) -> None:
    """Print formatted maintenance status"""
    print("\nMaintenance Status Check")
    print("=" * 60)
    
    # Cron Jobs
    print("\nScheduled Tasks:")
    print("-" * 60)
    cron = status['cron_jobs']
    if cron.get('error'):
        print(f"Error checking cron jobs: {cron['error']}")
    elif not cron['configured']:
        print("⚠️  No maintenance tasks scheduled")
    else:
        for job in cron['jobs']:
            print(f"Schedule: {job['schedule']}")
            print(f"Command: {job['command']}")
            if job.get('comment'):
                print(f"Comment: {job['comment']}")
    
    # Last Run
    print("\nLast Maintenance Run:")
    print("-" * 60)
    last_run = status['last_maintenance']
    if last_run.get('error'):
        print(f"Error checking last run: {last_run['error']}")
    else:
        status_icon = "✓" if last_run['success'] else "✗"
        print(f"{status_icon} Last run: {last_run['last_run']}")
        print(f"Log file: {last_run['log_file']}")
        print(f"Age: {last_run['age_hours']:.1f} hours")
    
    # Monitoring
    print("\nMonitoring Status:")
    print("-" * 60)
    monitoring = status['monitoring']
    if monitoring['running']:
        print(f"✓ Running (PID: {monitoring['pid']})")
        print(f"Uptime: {monitoring['uptime']}")
        print(f"Memory: {monitoring['memory_mb']:.1f}MB")
        print(f"CPU: {monitoring['cpu_percent']:.1f}%")
    else:
        print(f"✗ Not running: {monitoring.get('error', monitoring['message'])}")
    
    # Disk Usage
    print("\nDisk Usage:")
    print("-" * 60)
    disk = status['disk_usage']
    if disk.get('error'):
        print(f"Error checking disk usage: {disk['error']}")
    else:
        print(f"Logs: {disk['logs_mb']:.1f}MB")
        print(f"Models: {disk['models_mb']:.1f}MB")
        print(f"Total: {disk['total_mb']:.1f}MB")

def main():
    """Main status check function"""
    try:
        status = {
            'timestamp': datetime.now().isoformat(),
            'cron_jobs': check_cron_jobs(),
            'last_maintenance': check_last_maintenance(),
            'monitoring': check_monitoring_daemon(),
            'disk_usage': check_disk_usage()
        }
        
        print_status(status)
        
        # Save status to file
        status_file = Path(parent_dir) / 'logs' / 'maintenance_status.json'
        with open(status_file, 'w') as f:
            json.dump(status, f, indent=2)
        
        # Exit with appropriate status code
        if all(not d.get('error') for d in status.values() if isinstance(d, dict)):
            sys.exit(0)
        else:
            sys.exit(1)
    
    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStatus check cancelled by user")
        sys.exit(1)
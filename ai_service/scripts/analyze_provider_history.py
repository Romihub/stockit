#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List
import argparse
from collections import defaultdict

# Add parent directory to path for imports
parent_dir = str(Path(__file__).parent.parent)
sys.path.append(parent_dir)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def parse_date(date_str: str) -> datetime:
    """Parse date from ISO format string"""
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except ValueError:
        return datetime.min

def load_status_files(days: int = 7) -> List[Dict]:
    """Load historical status files"""
    logs_dir = Path(parent_dir) / 'logs'
    if not logs_dir.exists():
        return []
    
    cutoff_date = datetime.now() - timedelta(days=days)
    status_files = []
    
    # Load all status files
    for status_file in logs_dir.glob('provider_status_*.json'):
        try:
            with open(status_file) as f:
                data = json.load(f)
                timestamp = parse_date(data['timestamp'])
                if timestamp >= cutoff_date:
                    status_files.append(data)
        except Exception as e:
            logger.warning(f"Error loading {status_file}: {str(e)}")
    
    # Sort by timestamp
    return sorted(status_files, key=lambda x: parse_date(x['timestamp']))

def calculate_metrics(status_files: List[Dict]) -> Dict:
    """Calculate provider metrics from historical data"""
    metrics = defaultdict(lambda: defaultdict(lambda: {
        'total_checks': 0,
        'successful': 0,
        'errors': 0,
        'not_configured': 0,
        'response_times': [],
        'rate_limits': [],
        'error_messages': defaultdict(int)
    }))
    
    for status_file in status_files:
        for category, providers in status_file['results'].items():
            for provider in providers:
                name = provider['provider']
                stats = metrics[category][name]
                
                stats['total_checks'] += 1
                
                if provider['status'] == 'operational':
                    stats['successful'] += 1
                    if 'response_time' in provider:
                        stats['response_times'].append(provider['response_time'])
                    if 'rate_limit_remaining' in provider:
                        try:
                            limit = int(provider['rate_limit_remaining'])
                            stats['rate_limits'].append(limit)
                        except (ValueError, TypeError):
                            pass
                elif provider['status'] == 'error':
                    stats['errors'] += 1
                    if 'message' in provider:
                        stats['error_messages'][provider['message']] += 1
                else:  # not_configured
                    stats['not_configured'] += 1
    
    return metrics

def format_duration(minutes: int) -> str:
    """Format minutes into human-readable duration"""
    if minutes < 60:
        return f"{minutes}m"
    hours = minutes // 60
    mins = minutes % 60
    if hours < 24:
        return f"{hours}h {mins}m"
    days = hours // 24
    hrs = hours % 24
    return f"{days}d {hrs}h {mins}m"

def print_report(metrics: Dict, days: int) -> None:
    """Print analysis report"""
    print(f"\nProvider Status Analysis (Last {days} days)")
    print("=" * 60)
    
    for category, providers in metrics.items():
        print(f"\n{category}:")
        print("-" * 60)
        
        for name, stats in providers.items():
            total = stats['total_checks']
            if total == 0:
                continue
            
            success_rate = (stats['successful'] / total) * 100
            avg_response = (
                sum(stats['response_times']) / len(stats['response_times'])
                if stats['response_times'] else 0
            )
            
            print(f"\n{name}:")
            print(f"Availability: {success_rate:.1f}%")
            print(f"Total Checks: {total}")
            print(f"Successful: {stats['successful']}")
            print(f"Errors: {stats['errors']}")
            print(f"Not Configured: {stats['not_configured']}")
            
            if stats['response_times']:
                print(f"Response Time: {avg_response:.1f}ms (avg)")
                print(f"             {min(stats['response_times']):.1f}ms (min)")
                print(f"             {max(stats['response_times']):.1f}ms (max)")
            
            if stats['rate_limits']:
                print(f"Rate Limits: {sum(stats['rate_limits'])/len(stats['rate_limits']):.0f} (avg)")
                print(f"            {min(stats['rate_limits'])} (min)")
                print(f"            {max(stats['rate_limits'])} (max)")
            
            if stats['error_messages']:
                print("\nTop Errors:")
                sorted_errors = sorted(
                    stats['error_messages'].items(),
                    key=lambda x: x[1],
                    reverse=True
                )
                for msg, count in sorted_errors[:3]:
                    print(f"- {msg}: {count} times")

def save_report(metrics: Dict, days: int) -> None:
    """Save analysis report to file"""
    report = {
        'timestamp': datetime.now().isoformat(),
        'period_days': days,
        'metrics': metrics
    }
    
    report_file = Path(parent_dir) / 'logs' / 'provider_analysis.json'
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"Analysis report saved to {report_file}")

def main():
    """Main analysis function"""
    parser = argparse.ArgumentParser(description='Analyze provider status history')
    parser.add_argument(
        '--days',
        type=int,
        default=7,
        help='Number of days to analyze (default: 7)'
    )
    args = parser.parse_args()
    
    try:
        status_files = load_status_files(args.days)
        if not status_files:
            print("No status data found for the specified period")
            sys.exit(1)
        
        metrics = calculate_metrics(status_files)
        print_report(metrics, args.days)
        save_report(metrics, args.days)
        
        sys.exit(0)
    
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nAnalysis cancelled by user")
        sys.exit(1)
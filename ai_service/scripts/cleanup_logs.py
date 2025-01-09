#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import logging
import json
from datetime import datetime, timedelta
import shutil

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

def cleanup_api_test_results(days: int = 30) -> None:
    """Clean up old API test results"""
    results_file = Path(parent_dir) / 'logs' / 'api_test_results.json'
    if not results_file.exists():
        return
    
    try:
        with open(results_file) as f:
            data = json.load(f)
        
        # Keep only recent results
        cutoff_date = datetime.now() - timedelta(days=days)
        if 'timestamp' in data:
            test_date = parse_date(data['timestamp'])
            if test_date < cutoff_date:
                results_file.unlink()
                logger.info(f"Removed old API test results: {results_file}")
    except Exception as e:
        logger.error(f"Error cleaning up API test results: {str(e)}")

def cleanup_verification_results(days: int = 30) -> None:
    """Clean up old verification results"""
    results_file = Path(parent_dir) / 'logs' / 'verification_results.json'
    if not results_file.exists():
        return
    
    try:
        with open(results_file) as f:
            data = json.load(f)
        
        # Keep only recent results
        cutoff_date = datetime.now() - timedelta(days=days)
        if 'timestamp' in data:
            test_date = parse_date(data['timestamp'])
            if test_date < cutoff_date:
                results_file.unlink()
                logger.info(f"Removed old verification results: {results_file}")
    except Exception as e:
        logger.error(f"Error cleaning up verification results: {str(e)}")

def cleanup_log_files(days: int = 30, max_size_mb: int = 100) -> None:
    """Clean up old and large log files"""
    log_dir = Path(parent_dir) / 'logs'
    if not log_dir.exists():
        return
    
    max_size = max_size_mb * 1024 * 1024  # Convert MB to bytes
    cutoff_date = datetime.now() - timedelta(days=days)
    
    for log_file in log_dir.glob('*.log*'):
        try:
            # Check file age
            mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
            if mtime < cutoff_date:
                log_file.unlink()
                logger.info(f"Removed old log file: {log_file}")
                continue
            
            # Check file size
            if log_file.stat().st_size > max_size:
                # Archive large files
                archive_dir = log_dir / 'archive'
                archive_dir.mkdir(exist_ok=True)
                
                archive_name = f"{log_file.stem}_{mtime.strftime('%Y%m%d')}.gz"
                archive_path = archive_dir / archive_name
                
                # Compress and move
                shutil.copy2(log_file, archive_path)
                log_file.unlink()
                logger.info(f"Archived large log file: {log_file} -> {archive_path}")
        
        except Exception as e:
            logger.error(f"Error processing log file {log_file}: {str(e)}")

def cleanup_model_files(keep_versions: int = 3) -> None:
    """Keep only recent model versions"""
    models_dir = Path(parent_dir) / 'models'
    if not models_dir.exists():
        return
    
    try:
        # Group model files by symbol
        model_files = {}
        for model_file in models_dir.glob('*_model.h5'):
            symbol = model_file.stem.split('_')[0]
            if symbol not in model_files:
                model_files[symbol] = []
            model_files[symbol].append(model_file)
        
        # Keep only recent versions for each symbol
        for symbol, files in model_files.items():
            if len(files) > keep_versions:
                # Sort by modification time, newest first
                files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
                
                # Remove older versions
                for old_file in files[keep_versions:]:
                    old_file.unlink()
                    logger.info(f"Removed old model file: {old_file}")
    
    except Exception as e:
        logger.error(f"Error cleaning up model files: {str(e)}")

def main():
    """Main cleanup function"""
    print("\nCleaning up old files and logs...")
    print("-" * 50)
    
    try:
        cleanup_api_test_results()
        cleanup_verification_results()
        cleanup_log_files()
        cleanup_model_files()
        
        print("\n✓ Cleanup completed successfully")
        sys.exit(0)
    
    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")
        print("\n✗ Cleanup failed. Check logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nCleanup cancelled by user")
        sys.exit(1)
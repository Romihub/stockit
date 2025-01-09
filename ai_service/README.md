# StockIt AI Service

The AI service component of StockIt provides machine learning-based stock price predictions and analysis. It includes a monitoring system for tracking model performance and a dashboard for visualizing metrics.

## Prerequisites

- Python 3.8 or higher
- Redis (optional, for caching)
- CUDA-compatible GPU (optional, for faster training)
- API keys for data providers

## Initial Setup

1. Verify script permissions:
   ```bash
   cd ai_service
   ./scripts/verify_permissions.sh  # Check and fix script permissions
   ```
   The verification script will:
   - Check all script permissions
   - Identify any non-executable scripts
   - Offer to fix permissions automatically
   
   Example output:
   ```
   [*] Checking script permissions...
   ----------------------------------------
   [*] Script permissions OK: scripts/setup_api_keys.py
   [*] Script permissions OK: scripts/test_api_keys.py
   [x] Script not executable: scripts/verify_setup.py
   [x] Script not executable: scripts/daily_maintenance.sh
   
   [!] Found 2 script(s) with incorrect permissions
   Would you like to fix permissions? (y/N) y
   
   [*] Fixing permissions...
   [*] Fixed permissions for: scripts/verify_setup.py
   [*] Fixed permissions for: scripts/daily_maintenance.sh
   
   [*] Verifying fixes...
   [*] Script permissions OK: scripts/verify_setup.py
   [*] Script permissions OK: scripts/daily_maintenance.sh
   
   [*] All permissions fixed successfully
   ```

2. Configure API keys:
   ```bash
   ./scripts/setup_api_keys.py  # Interactive API key setup
   ```
   The setup script will:
   - Guide you through the signup process for each provider
   - Securely store your API keys
   - Update the .env configuration

2. Test API keys:
   ```bash
   ./scripts/test_api_keys.py  # Validate API key configurations
   ```
   The test script will:
   - Verify connectivity to each provider
   - Validate API key permissions
   - Generate a test report in logs/api_test_results.json
   - Display a summary of working and failed keys

   Example output:
   ```
   Testing Market Data providers:
   --------------------------------------------------
   ✓ ALPHA_VANTAGE_API_KEY: API response valid
   ✓ FINNHUB_API_KEY: API response valid
   
   Testing Real-time Data providers:
   --------------------------------------------------
   ✓ POLYGON_API_KEY: API response valid
   ⚠️ TIINGO_API_KEY: Not configured
   ✗ MARKETSTACK_API_KEY: HTTP 401: Invalid API key
   
   Test Summary
   --------------------------------------------------
   Total Providers: 12
   ✓ Successful: 8
   ✗ Failed: 2
   ⚠️ Skipped: 2
   ```

3. Verify setup:
   ```bash
   ./scripts/verify_setup.py  # Check all components
   ```
   The verification script checks:
   - Required directories
   - GPU availability
   - Redis connection
   - Sample data
   - Model files
   - Monitoring system
   - API endpoints

4. Run the service:
   ```bash
   ./run_service.sh        # For production mode
   # or
   ./run_service.sh --dev  # For development mode
   ```

5. Access the dashboard:
   - Open `http://localhost:8000/dashboard`
   - Select a symbol to view metrics

## API Key Management

### Key Storage and Security
- API keys are stored in `.env` file
- Backup keys are securely stored in `.keys/api_keys.json`
- Keys are never logged or exposed in error messages
- Use environment-specific keys for development/production

### Rate Limiting and Quotas
Each provider has different rate limits:
- Alpha Vantage: 5 calls/minute, 500 calls/day
- Polygon.io: 5 calls/minute (Basic), Unlimited (Premium)
- Tiingo: 500 calls/hour, 20K calls/day
- Marketstack: 100 calls/month (Basic), 2K-10K calls/month (Premium)
- Twelve Data: 800 calls/day (Basic), 100 calls/minute (Premium)

### Provider Health Monitoring
1. Check current status:
   ```bash
   ./scripts/check_provider_status.py  # Check all providers
   ```
   The status check shows:
   - Response times
   - Rate limit status
   - API availability
   - Error details

   Example output:
   ```
   Checking Market Data providers:
   --------------------------------------------------
   ✓ Alpha Vantage        45.2ms, Rate limit: 495
   ✓ Finnhub             122.5ms, Rate limit: 28
   
   Checking Real-time Data providers:
   --------------------------------------------------
   ✓ Polygon.io           67.8ms, Rate limit: 4990
   ⚠️ Tiingo              Not configured
   ✗ Marketstack         HTTP 429: Rate limit exceeded
   
   Status Summary
   --------------------------------------------------
   Market Data:
   ✓ Operational: 2
   ✗ Error: 0
   ⚠️ Not Configured: 0
   
   Real-time Data:
   ✓ Operational: 1
   ✗ Error: 1
   ⚠️ Not Configured: 1
   ```

2. Automated monitoring:
   - Status checks run every 5 minutes
   - Results logged to logs/provider_status.json
   - Alerts on repeated failures
   - Dashboard shows provider health metrics

### Key Rotation and Updates
1. Regular testing:
   ```bash
   ./scripts/test_api_keys.py --provider [provider_name]  # Test specific provider
   ./scripts/test_api_keys.py --all                       # Test all providers
   ```

2. Bulk updates:
   ```bash
   ./scripts/update_all_keys.sh  # Update all API keys at once
   ```
   The update script:
   - Creates backup of current configuration
   - Runs interactive setup for all providers
   - Tests new API keys
   - Offers rollback on failures
   - Cleans up old backups
   - Archives test results

3. Automatic fallback:
   - System automatically switches to backup providers
   - Logs provider failures in monitoring dashboard
   - Alerts on repeated API failures

4. Key rotation schedule:
   - Rotate keys every 90 days
   - Keep previous key active for 7 days
   - Test new keys before deployment
   - Use update_all_keys.sh for smooth transitions

## Log Management

The service maintains various logs and test results for monitoring and debugging:

### Log Types
1. Service Logs:
   - Located in `logs/ai_service.log`
   - Contains operational logs
   - Rotated daily, compressed after 100MB

2. Test Results:
   - API test results in `logs/api_test_results.json`
   - Verification results in `logs/verification_results.json`
   - Model test metrics in `models/{symbol}_test_metrics.json`

3. Model Files:
   - Latest model versions in `models/`
   - Archived models in `models/archive/`
   - Test predictions in `models/{symbol}_prediction_results.json`

### Cleanup and Maintenance
Run the cleanup script to manage logs and test results:
```bash
./scripts/cleanup_logs.py  # Clean old logs and test results
```

The script handles:
- Removing logs older than 30 days
- Archiving large log files (>100MB)
- Keeping only recent model versions (last 3)
- Cleaning up old test results

Cleanup options:
```bash
./scripts/cleanup_logs.py --days 60          # Keep logs for 60 days
./scripts/cleanup_logs.py --max-size 200     # Archive at 200MB
./scripts/cleanup_logs.py --keep-versions 5  # Keep 5 model versions
```

## System Maintenance

### Automated Maintenance
1. Run daily maintenance:
   ```bash
   ./scripts/daily_maintenance.sh        # Run with output
   ./scripts/daily_maintenance.sh --quiet # Run silently
   ```
   
   The script performs:
   - System status checks
   - Monitoring daemon verification
   - API key validation
   - Disk space management
   - Log rotation
   - Report generation
   
   Example output:
   ```
   [*] Starting daily maintenance tasks...
   ----------------------------------------
   [*] Checking monitoring daemon...
   [*] Monitoring daemon is running
   [*] Checking disk space...
   Current disk usage:
   Logs: 25M
   Models: 156M
   [*] Checking API keys...
   [*] Generating system reports...
   
   Maintenance Summary:
   ----------------------------------------
   ✓ Monitoring status checked
   ✓ Disk space verified
   ✓ API keys tested
   ✓ System reports generated
   ✓ Log file: logs/maintenance_20250107_064134.log
   ```

2. Schedule maintenance:
   ```bash
   # Add to crontab (runs at 1 AM daily)
   0 1 * * * cd /path/to/ai_service && ./scripts/daily_maintenance.sh --quiet
   
   # View maintenance logs
   tail -f logs/maintenance_*.log
   ```

3. Check maintenance status:
   ```bash
   ./scripts/check_maintenance.py  # View maintenance status
   ```
   
   Status output:
   ```
   Maintenance Status Check
   ============================================================

   Scheduled Tasks:
   ------------------------------------------------------------
   Schedule: 0 1 * * *
   Command: cd /path/to/ai_service && ./scripts/daily_maintenance.sh --quiet
   Comment: Daily maintenance at 1 AM

   Last Maintenance Run:
   ------------------------------------------------------------
   ✓ Last run: 2025-01-07T01:00:05
   Log file: maintenance_20250107_010005.log
   Age: 5.8 hours

   Monitoring Status:
   ------------------------------------------------------------
   ✓ Running (PID: 1234)
   Uptime: 2 days, 5 hours, 30 minutes
   Memory: 45.2MB
   CPU: 2.1%

   Disk Usage:
   ------------------------------------------------------------
   Logs: 25.4MB
   Models: 156.8MB
   Total: 182.2MB
   ```

4. Monitor results:
   - Check maintenance logs
   - Review generated reports
   - Monitor system metrics
   - Track provider health
   - Verify scheduled tasks

### Weekly Tasks
1. Analyze provider performance:
   ```bash
   ./scripts/analyze_provider_history.py --days 7
   ```

2. Update API keys:
   ```bash
   ./scripts/update_all_keys.sh  # Rotate keys if needed
   ```

3. Clean up logs:
   ```bash
   ./scripts/cleanup_logs.py  # Archive old logs
   ```

### Monthly Tasks
1. Long-term analysis:
   ```bash
   ./scripts/analyze_provider_history.py --days 30
   ```

2. Review API quotas:
   - Check usage patterns
   - Consider tier upgrades
   - Optimize data fetching

3. System optimization:
   - Archive old model versions
   - Compress historical data
   - Update provider configurations

### Best Practices
1. Monitoring:
   - Keep monitoring daemon running
   - Set up email alerts
   - Monitor rate limits closely
   - Review logs regularly

2. Data Management:
   - Archive logs after 30 days
   - Keep 3 recent model versions
   - Compress historical data
   - Regular backups

3. API Keys:
   - Rotate keys every 90 days
   - Use separate dev/prod keys
   - Monitor usage patterns
   - Keep backup providers ready

4. Performance:
   - Monitor memory usage
   - Check response times
   - Optimize cache settings
   - Balance load across providers

## Maintenance Troubleshooting

### Common Issues

1. Failed Maintenance:
   ```bash
   # Check maintenance status
   ./scripts/check_maintenance.py
   
   # Review recent logs
   tail -f logs/maintenance_*.log
   
   # Retry maintenance manually
   ./scripts/daily_maintenance.sh
   ```
   
   Common causes:
   - Disk space full
   - Monitoring daemon crashed
   - API rate limits exceeded
   - Network connectivity issues

2. Monitoring Problems:
   ```bash
   # Check monitoring status
   ps aux | grep monitor_providers
   
   # Review monitoring logs
   tail -f logs/monitor.log
   
   # Restart monitoring
   ./scripts/stop_monitoring.sh
   ./scripts/monitor_providers.sh --daemon
   ```
   
   Common causes:
   - Process killed by OOM
   - Stale PID file
   - Configuration errors
   - Resource constraints

3. Data Provider Issues:
   ```bash
   # Check provider status
   ./scripts/check_provider_status.py
   
   # Test API keys
   ./scripts/test_api_keys.py
   
   # Review provider logs
   tail -f logs/provider_status.json
   ```
   
   Common causes:
   - Expired API keys
   - Rate limits reached
   - Provider outages
   - Network timeouts

### Recovery Steps

1. System Issues:
   - Clear old logs
   - Archive historical data
   - Restart monitoring
   - Verify disk space

2. Provider Issues:
   - Rotate API keys
   - Switch to backup providers
   - Adjust rate limits
   - Update configurations

3. Data Issues:
   - Validate data integrity
   - Rebuild caches
   - Rerun failed tasks
   - Update stale data

### Prevention

1. Regular Checks:
   - Monitor disk usage
   - Track API quotas
   - Review error logs
   - Test backup providers

2. Proactive Updates:
   - Rotate keys before expiry
   - Archive old data regularly
   - Update configurations
   - Test recovery procedures

3. Documentation:
   - Keep runbooks updated
   - Document incidents
   - Track resolution steps
   - Share best practices
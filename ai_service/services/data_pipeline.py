import redis
import numpy as np
from typing import Dict, List, Optional, Union
import json
from datetime import datetime, timedelta

class DataValidator:
    """Validates incoming stock data"""
    
    @staticmethod
    def validate_price_data(data: Dict) -> bool:
        required_fields = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
        if not all(field in data for field in required_fields):
            return False
            
        # Validate numeric fields
        numeric_fields = ['open', 'high', 'low', 'close', 'volume']
        for field in numeric_fields:
            if not isinstance(data[field], (int, float)) or data[field] < 0:
                return False
                
        # Validate price relationships
        if not (data['low'] <= data['open'] <= data['high'] and 
                data['low'] <= data['close'] <= data['high']):
            return False
            
        # Validate timestamp
        try:
            timestamp = datetime.fromtimestamp(data['timestamp'])
            if timestamp > datetime.now():
                return False
        except:
            return False
            
        return True

    @staticmethod
    def validate_historical_data(data: List[Dict]) -> bool:
        if not isinstance(data, list) or not data:
            return False
            
        # Validate each data point
        return all(DataValidator.validate_price_data(point) for point in data)

class DataCleaner:
    """Cleans and preprocesses stock data"""
    
    @staticmethod
    def remove_outliers(data: List[Dict], field: str, threshold: float = 3) -> List[Dict]:
        """Remove outliers using z-score method"""
        values = np.array([d[field] for d in data])
        z_scores = np.abs((values - np.mean(values)) / np.std(values))
        return [d for d, z in zip(data, z_scores) if z < threshold]

    @staticmethod
    def fill_missing_values(data: List[Dict]) -> List[Dict]:
        """Fill missing values using linear interpolation"""
        for field in ['open', 'high', 'low', 'close', 'volume']:
            values = [d[field] for d in data]
            if None in values:
                indices = np.arange(len(values))
                valid_mask = [v is not None for v in values]
                valid_indices = indices[valid_mask]
                valid_values = np.array([v for v in values if v is not None])
                interpolator = np.interp(indices, valid_indices, valid_values)
                
                for i, d in enumerate(data):
                    if d[field] is None:
                        d[field] = float(interpolator[i])
        
        return data

    @staticmethod
    def normalize_timestamps(data: List[Dict]) -> List[Dict]:
        """Ensure timestamps are in consistent format"""
        for item in data:
            if isinstance(item['timestamp'], str):
                try:
                    item['timestamp'] = int(datetime.strptime(
                        item['timestamp'], 
                        '%Y-%m-%dT%H:%M:%S.%fZ'
                    ).timestamp())
                except ValueError:
                    try:
                        item['timestamp'] = int(datetime.strptime(
                            item['timestamp'], 
                            '%Y-%m-%d %H:%M:%S'
                        ).timestamp())
                    except ValueError:
                        continue
        return data

class RedisCache:
    """Handles caching of stock data using Redis"""
    
    def __init__(self, host: str = 'localhost', port: int = 6379, db: int = 0):
        self.redis_client = redis.Redis(host=host, port=port, db=db)
        self.default_expiry = timedelta(minutes=5)  # 5 minutes default cache

    def get(self, key: str) -> Optional[Union[Dict, List[Dict]]]:
        """Retrieve data from cache"""
        data = self.redis_client.get(key)
        if data:
            return json.loads(data)
        return None

    def set(self, key: str, value: Union[Dict, List[Dict]], expiry: Optional[timedelta] = None) -> None:
        """Store data in cache"""
        if expiry is None:
            expiry = self.default_expiry
            
        self.redis_client.setex(
            key,
            expiry,
            json.dumps(value)
        )

    def invalidate(self, key: str) -> None:
        """Remove data from cache"""
        self.redis_client.delete(key)

class EnhancedDataPipeline:
    """Main data pipeline for processing stock data"""
    
    def __init__(self):
        self.cache = RedisCache()
        self.validator = DataValidator()
        self.cleaner = DataCleaner()

    async def process_stock_data(
        self, 
        symbol: str, 
        data: List[Dict],
        cache_key: Optional[str] = None
    ) -> List[Dict]:
        """Process stock data through the pipeline"""
        
        # Validate data
        if not self.validator.validate_historical_data(data):
            raise ValueError(f"Invalid data format for symbol {symbol}")

        # Clean data
        cleaned_data = self.cleaner.normalize_timestamps(data)
        cleaned_data = self.cleaner.remove_outliers(cleaned_data, 'close')
        cleaned_data = self.cleaner.fill_missing_values(cleaned_data)

        # Cache results if cache_key provided
        if cache_key:
            self.cache.set(cache_key, cleaned_data)

        return cleaned_data

    def get_cached_data(self, cache_key: str) -> Optional[List[Dict]]:
        """Retrieve cached data"""
        return self.cache.get(cache_key)

    def invalidate_cache(self, cache_key: str) -> None:
        """Invalidate cached data"""
        self.cache.invalidate(cache_key)

    def generate_cache_key(self, symbol: str, data_type: str) -> str:
        """Generate a cache key for stock data"""
        return f"stock:{symbol}:{data_type}"
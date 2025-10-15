"""
Redis connection and caching utilities
"""

import redis
import json
from typing import Any, Optional
from .config import settings
from loguru import logger


class RedisClient:
    """Redis client wrapper with caching utilities"""
    
    def __init__(self):
        self.redis_client = None
        
    async def connect(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            logger.info("Redis connection established successfully")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Caching will be disabled.")
            self.redis_client = None
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache"""
        if not self.redis_client:
            return None
            
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.error(f"Redis get error: {e}")
        return None
    
    def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set value in Redis cache"""
        if not self.redis_client:
            return False
            
        try:
            ttl = ttl or settings.CACHE_TTL
            return self.redis_client.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.error(f"Redis set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from Redis cache"""
        if not self.redis_client:
            return False
            
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return False


# Global Redis client instance
redis_client = RedisClient()


async def init_redis():
    """Initialize Redis connection"""
    await redis_client.connect()


def get_redis_client() -> RedisClient:
    """Get Redis client instance"""
    return redis_client
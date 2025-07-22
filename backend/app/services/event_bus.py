import threading
import json
import logging
import os
from datetime import datetime
try:
    import redis
except ImportError:
    redis = None

class EventBus:
    _instance = None

    def __init__(self, redis_url=None):
        if redis_url is None:
            redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
        self._subscribers = {}
        self.logger = logging.getLogger(__name__)
        self.redis_url = redis_url
        self.redis_enabled = False
        if redis:
            try:
                self.redis_client = redis.Redis.from_url(redis_url)
                self.redis_pubsub = self.redis_client.pubsub()
                self.redis_enabled = True
                self.logger.info('Redis EventBus enabled')
            except Exception as e:
                self.logger.warning(f'Could not connect to Redis: {e}. Falling back to in-memory EventBus.')
                self.redis_enabled = False
        else:
            self.logger.warning('redis-py not installed. Falling back to in-memory EventBus.')
            self.redis_enabled = False

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def subscribe(self, event_name, callback):
        if self.redis_enabled:
            def redis_listener():
                self.redis_pubsub.subscribe(event_name)
                for message in self.redis_pubsub.listen():
                    if message['type'] == 'message':
                        data = json.loads(message['data'])
                        callback(**data)
            thread = threading.Thread(target=redis_listener, daemon=True)
            thread.start()
        else:
            if event_name not in self._subscribers:
                self._subscribers[event_name] = []
            self._subscribers[event_name].append(callback)

    def emit(self, event_name, **kwargs):
        if self.redis_enabled:
            def default_serializer(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                raise TypeError(f"Type {type(obj)} not serializable")
            self.redis_client.publish(event_name, json.dumps(kwargs, default=default_serializer))
        else:
            for callback in self._subscribers.get(event_name, []):
                callback(**kwargs) 
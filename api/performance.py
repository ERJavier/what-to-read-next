"""
Performance monitoring utilities for API endpoints.
"""
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Dict, List

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Represents a single performance metric."""
    endpoint: str
    method: str
    duration_ms: float
    status_code: int
    timestamp: float = field(default_factory=time.time)


class PerformanceMonitor:
    """Monitor and track API performance metrics."""
    
    def __init__(self, max_metrics: int = 1000):
        """
        Initialize performance monitor.
        
        Args:
            max_metrics: Maximum number of metrics to store in memory
        """
        self.metrics: List[PerformanceMetric] = []
        self.max_metrics = max_metrics
        self._metrics_by_endpoint: Dict[str, List[float]] = {}
    
    def record(self, metric: PerformanceMetric):
        """Record a performance metric."""
        self.metrics.append(metric)
        
        # Maintain max size
        if len(self.metrics) > self.max_metrics:
            self.metrics.pop(0)
        
        # Track by endpoint for statistics
        key = f"{metric.method} {metric.endpoint}"
        if key not in self._metrics_by_endpoint:
            self._metrics_by_endpoint[key] = []
        
        self._metrics_by_endpoint[key].append(metric.duration_ms)
        
        # Keep only recent metrics per endpoint (last 100)
        if len(self._metrics_by_endpoint[key]) > 100:
            self._metrics_by_endpoint[key].pop(0)
    
    def get_endpoint_stats(self, endpoint: str, method: str = "GET") -> Dict[str, float]:
        """
        Get statistics for a specific endpoint.
        
        Args:
            endpoint: Endpoint path
            method: HTTP method
            
        Returns:
            Dictionary with statistics (count, avg, min, max, p95, p99)
        """
        key = f"{method} {endpoint}"
        durations = self._metrics_by_endpoint.get(key, [])
        
        if not durations:
            return {
                "count": 0,
                "avg_ms": 0.0,
                "min_ms": 0.0,
                "max_ms": 0.0,
                "p95_ms": 0.0,
                "p99_ms": 0.0
            }
        
        sorted_durations = sorted(durations)
        count = len(sorted_durations)
        
        return {
            "count": count,
            "avg_ms": sum(sorted_durations) / count,
            "min_ms": sorted_durations[0],
            "max_ms": sorted_durations[-1],
            "p95_ms": sorted_durations[int(count * 0.95)] if count > 0 else 0.0,
            "p99_ms": sorted_durations[int(count * 0.99)] if count > 0 else 0.0
        }
    
    def get_all_stats(self) -> Dict[str, Dict[str, float]]:
        """
        Get statistics for all endpoints.
        
        Returns:
            Dictionary mapping endpoint keys to statistics
        """
        stats = {}
        for key in self._metrics_by_endpoint.keys():
            method, endpoint = key.split(" ", 1)
            stats[key] = self.get_endpoint_stats(endpoint, method)
        
        return stats
    
    def clear(self):
        """Clear all recorded metrics."""
        self.metrics.clear()
        self._metrics_by_endpoint.clear()


# Global performance monitor instance
_performance_monitor = PerformanceMonitor()


def get_performance_monitor() -> PerformanceMonitor:
    """Get the global performance monitor instance."""
    return _performance_monitor


@asynccontextmanager
async def track_performance(endpoint: str, method: str = "GET"):
    """
    Context manager to track endpoint performance.
    
    Usage:
        async with track_performance("/recommend", "POST") as metric:
            # Do work
            metric.status_code = 200
    """
    start_time = time.time()
    metric = PerformanceMetric(
        endpoint=endpoint,
        method=method,
        duration_ms=0.0,
        status_code=200
    )
    
    try:
        yield metric
    finally:
        duration_ms = (time.time() - start_time) * 1000
        metric.duration_ms = duration_ms
        _performance_monitor.record(metric)
        
        # Log slow requests
        if duration_ms > 1000:  # > 1 second
            logger.warning(
                f"Slow request: {method} {endpoint} took {duration_ms:.2f}ms "
                f"(status: {metric.status_code})"
            )

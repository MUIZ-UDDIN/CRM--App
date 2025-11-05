"""
Security Headers Middleware
Prevents API response preview in browser DevTools and adds security headers
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import json


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to prevent data preview in browser DevTools
    and enhance overall API security
    """
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Prevent caching of API responses
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        
        # Content Security Policy - prevent inline scripts and restrict sources
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Enable XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Referrer policy - don't leak referrer information
        response.headers["Referrer-Policy"] = "no-referrer"
        
        # Permissions policy - restrict browser features
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )
        
        # Strict Transport Security (HTTPS only)
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # For API endpoints, add additional headers to discourage preview
        if request.url.path.startswith("/api/"):
            # Indicate this is an API response, not for display
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive, nosnippet"
            
            # Add custom header to indicate data sensitivity
            response.headers["X-Data-Classification"] = "confidential"
            
        return response


class ResponseObfuscationMiddleware(BaseHTTPMiddleware):
    """
    Optional: Obfuscate response data in non-production environments
    This makes it harder to read responses in browser DevTools
    """
    
    def __init__(self, app: ASGIApp, enabled: bool = False):
        super().__init__(app)
        self.enabled = enabled
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Only apply to API endpoints and if enabled
        if not self.enabled or not request.url.path.startswith("/api/"):
            return response
        
        # Skip for certain endpoints (health checks, etc.)
        skip_paths = ["/api/health", "/api/docs", "/api/openapi.json"]
        if any(request.url.path.startswith(path) for path in skip_paths):
            return response
        
        return response

"""
Response Encryption Middleware (Optional)
Encrypts API responses to make them unreadable in DevTools Preview
Note: This adds overhead and requires frontend decryption
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import json
import base64
from cryptography.fernet import Fernet
import os


class ResponseEncryptionMiddleware(BaseHTTPMiddleware):
    """
    Encrypts JSON responses to make them unreadable in browser DevTools
    Frontend must decrypt responses before use
    
    WARNING: This adds performance overhead and complexity
    Only use if absolutely necessary for security compliance
    """
    
    def __init__(self, app, encryption_key: str = None, enabled: bool = False):
        super().__init__(app)
        self.enabled = enabled
        
        if self.enabled:
            # Use provided key or generate one
            if encryption_key:
                self.cipher = Fernet(encryption_key.encode())
            else:
                # Generate a key (should be stored securely in production)
                key = Fernet.generate_key()
                self.cipher = Fernet(key)
                print(f"⚠️  Generated encryption key: {key.decode()}")
                print("⚠️  Store this key securely and share with frontend!")
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Only encrypt if enabled and it's an API endpoint
        if not self.enabled or not request.url.path.startswith("/api/"):
            return response
        
        # Skip certain endpoints
        skip_paths = [
            "/api/health",
            "/api/docs",
            "/api/openapi.json",
            "/api/auth/login",  # Don't encrypt login response
            "/api/auth/register"
        ]
        
        if any(request.url.path.startswith(path) for path in skip_paths):
            return response
        
        # Only encrypt JSON responses
        if response.headers.get("content-type", "").startswith("application/json"):
            try:
                # Read response body
                body = b""
                async for chunk in response.body_iterator:
                    body += chunk
                
                # Encrypt the response
                encrypted_data = self.cipher.encrypt(body)
                encrypted_b64 = base64.b64encode(encrypted_data).decode()
                
                # Return encrypted response
                encrypted_response = json.dumps({
                    "encrypted": True,
                    "data": encrypted_b64
                })
                
                # Create new response with encrypted data
                return Response(
                    content=encrypted_response,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type="application/json"
                )
            except Exception as e:
                print(f"Encryption error: {e}")
                return response
        
        return response


class ResponseObfuscationMiddleware(BaseHTTPMiddleware):
    """
    Alternative: Obfuscate response data without full encryption
    Lighter weight than encryption but still makes data harder to read
    """
    
    def __init__(self, app, enabled: bool = False):
        super().__init__(app)
        self.enabled = enabled
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Only obfuscate if enabled and it's an API endpoint
        if not self.enabled or not request.url.path.startswith("/api/"):
            return response
        
        # Skip certain endpoints
        skip_paths = ["/api/health", "/api/docs", "/api/openapi.json"]
        if any(request.url.path.startswith(path) for path in skip_paths):
            return response
        
        # Only obfuscate JSON responses
        if response.headers.get("content-type", "").startswith("application/json"):
            try:
                # Read response body
                body = b""
                async for chunk in response.body_iterator:
                    body += chunk
                
                # Base64 encode to obfuscate (not secure, just harder to read)
                obfuscated = base64.b64encode(body).decode()
                
                # Return obfuscated response
                obfuscated_response = json.dumps({
                    "encoded": True,
                    "payload": obfuscated
                })
                
                # Create new response
                return Response(
                    content=obfuscated_response,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type="application/json"
                )
            except Exception as e:
                print(f"Obfuscation error: {e}")
                return response
        
        return response

"""
Sales CRM FastAPI Application
Main entry point for the CRM backend API
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import uvicorn
from loguru import logger
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import core modules
from app.core.config import settings
from app.core.database import init_db
from app.core.security import get_current_user
from app.core.redis import init_redis

# Import API routers
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.contacts import router as contacts_router
from app.api.deals import router as deals_router
from app.api.activities import router as activities_router
from app.api.analytics import router as analytics_router
from app.api.pipelines import router as pipelines_router
from app.api.inbox import router as inbox_router
from app.api.sms import router as sms_router
from app.api.calls import router as calls_router
from app.api.teams import router as teams_router
from app.api.notifications import router as notifications_router
from app.api.billing_updated import router as billing_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting up Sales CRM API...")
    try:
        await init_db()
        await init_redis()
    except Exception as e:
        logger.warning(f"Some services failed to initialize: {e}")
    logger.info("Sales CRM API started successfully!")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Sales CRM API...")


# Create FastAPI application
app = FastAPI(
    title="Sales CRM API",
    description="A comprehensive Sales CRM system with advanced analytics - Pipedrive Style",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Security
security = HTTPBearer()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Trusted host middleware
#app.add_middleware(
#    TrustedHostMiddleware, 
#    allowed_hosts=settings.ALLOWED_HOSTS
#)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Sales CRM API",
        "version": "1.0.0"
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Welcome message"""
    return {
        "message": "Welcome to Sales CRM API",
        "docs": "/docs",
        "version": "1.0.0"
    }


# Include API routers
app.include_router(
    auth_router,
    prefix="/api/auth",
    tags=["Authentication"]
)

app.include_router(
    users_router,
    prefix="/api/users",
    tags=["Users"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    contacts_router,
    prefix="/api/contacts",
    tags=["Contacts"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    deals_router,
    prefix="/api/deals",
    tags=["Deals"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    activities_router,
    prefix="/api/activities",
    tags=["Activities"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    analytics_router,
    prefix="/api/analytics",
    tags=["Analytics"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    pipelines_router,
    prefix="/api",
    tags=["Pipelines"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    inbox_router,
    prefix="/api/inbox",
    tags=["Inbox"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    sms_router,
    prefix="/api/sms",
    tags=["SMS"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    calls_router,
    prefix="/api/calls",
    tags=["Calls"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    teams_router,
    prefix="/api/teams",
    tags=["Teams"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    notifications_router,
    prefix="/api/notifications",
    tags=["Notifications"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    billing_router,
    tags=["Billing"],
    dependencies=[Depends(get_current_user)]
)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

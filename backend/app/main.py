"""
Sales CRM FastAPI Application
Main entry point for the CRM backend API
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import uvicorn
from loguru import logger
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

# Import with error handling for debugging
try:
    from app.api.emails import router as emails_router
    logger.info("✅ Emails router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import emails router: {e}")
    emails_router = None

try:
    from app.api.notifications import router as notifications_router
    logger.info("✅ Notifications router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import notifications router: {e}")
    notifications_router = None

from app.api.twilio_settings import router as twilio_settings_router

try:
    from app.api.files import router as files_router
    logger.info("✅ Files router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import files router: {e}")
    files_router = None

try:
    from app.api.workflows import router as workflows_router
    logger.info("✅ Workflows router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import workflows router: {e}")
    workflows_router = None


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

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sunstonecrm.com",
        "https://www.sunstonecrm.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

if emails_router:
    app.include_router(
        emails_router,
        prefix="/api/emails",
        tags=["Emails"],
        dependencies=[Depends(get_current_user)]
    )
    logger.info("✅ Emails routes registered")
else:
    logger.warning("⚠️ Emails router not loaded - skipping registration")

if notifications_router:
    app.include_router(
        notifications_router,
        prefix="/api/notifications",
        tags=["Notifications"],
        dependencies=[Depends(get_current_user)]
    )
    logger.info("✅ Notifications routes registered")
else:
    logger.warning("⚠️ Notifications router not loaded - skipping registration")

app.include_router(
    twilio_settings_router,
    prefix="/api",
    tags=["Twilio Settings"],
    dependencies=[Depends(get_current_user)]
)

if files_router:
    app.include_router(
        files_router,
        prefix="/api/files",
        tags=["Files"],
        dependencies=[Depends(get_current_user)]
    )
    logger.info("✅ Files routes registered")
else:
    logger.warning("⚠️ Files router not loaded - skipping registration")

if workflows_router:
    app.include_router(
        workflows_router,
        prefix="/api/workflows",
        tags=["Workflows"],
        dependencies=[Depends(get_current_user)]
    )
    logger.info("✅ Workflows routes registered")
else:
    logger.warning("⚠️ Workflows router not loaded - skipping registration")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

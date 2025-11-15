"""
Sales CRM FastAPI Application
Main entry point for the CRM backend API
"""

from fastapi import FastAPI, Depends, Request
from fastapi.responses import Response as FastAPIResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import uvicorn
from loguru import logger
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import core modules
from app.core.config import settings
from app.core.database import init_db, get_db
from app.core.security import get_current_user
from app.core.redis import init_redis
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.error_handlers import register_error_handlers

# Import API routers
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.contacts import router as contacts_router
from app.api.deals import router as deals_router
from app.api.activities import router as activities_router
from app.api.analytics import router as analytics_router
from app.api.admin_analytics import router as admin_analytics_router
from app.api.pipelines import router as pipelines_router
from app.api.inbox import router as inbox_router
from app.api.sms import router as sms_router
from app.api.twilio_settings import router as twilio_settings_router
from app.api.quotes import router as quotes_router
from app.api.calls import router as calls_router
from app.api.conversations import router as conversations_router
from app.api.analytics_enhanced import router as analytics_enhanced_router
from app.api.performance_alerts import router as performance_alerts_router
from app.api.voice_transcription import router as voice_transcription_router
from app.api.bulk_email_campaigns import router as bulk_email_campaigns_router
from app.api.companies import router as companies_router
from app.api.registration import router as registration_router
from app.api.invitations import router as invitations_router
from app.api.search import router as search_router
from app.api.websocket import router as websocket_router
from app.api.team import router as team_router
from app.api.teams import router as teams_router
from app.api.billing import router as billing_router

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

try:
    from app.api.sms_enhanced import router as sms_enhanced_router
    logger.info("✅ SMS Enhanced router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import SMS Enhanced router: {e}")
    sms_enhanced_router = None

try:
    from app.api.twilio_sync import router as twilio_sync_router
    logger.info("✅ Twilio Sync router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import Twilio Sync router: {e}")
    twilio_sync_router = None

try:
    from app.api.twilio_webhooks import router as twilio_webhooks_router
    logger.info("✅ Twilio Webhooks router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import Twilio Webhooks router: {e}")
    twilio_webhooks_router = None

try:
    from app.api.twilio_client import router as twilio_client_router
    logger.info("✅ Twilio Client router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import Twilio Client router: {e}")
    twilio_client_router = None

try:
    from app.api.support_tickets import router as support_tickets_router
    logger.info("✅ Support Tickets router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import Support Tickets router: {e}")
    support_tickets_router = None

try:
    from app.api.custom_fields import router as custom_fields_router
    logger.info(f"✅ Custom Fields router imported successfully: {custom_fields_router}")
except Exception as e:
    import traceback
    logger.error(f"❌ Failed to import Custom Fields router: {e}")
    logger.error(traceback.format_exc())
    custom_fields_router = None

try:
    from app.api.workflow_templates import router as workflow_templates_router
    logger.info("✅ Workflow Templates router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import Workflow Templates router: {e}")
    workflow_templates_router = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting up Sales CRM API...")
    try:
        await init_db()
        await init_redis()
        
        # Start workflow scheduler
        from app.services.workflow_scheduler import start_scheduler
        start_scheduler()
        logger.info("✅ Workflow scheduler started")
        
        # Start SMS scheduler
        from app.services.sms_scheduler import sms_scheduler
        sms_scheduler.start()
        logger.info("✅ SMS scheduler started")
    except Exception as e:
        logger.warning(f"Some services failed to initialize: {e}")
    logger.info("Sales CRM API started successfully!")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Sales CRM API...")
    try:
        from app.services.workflow_scheduler import stop_scheduler
        stop_scheduler()
        logger.info("Workflow scheduler stopped")
        
        from app.services.sms_scheduler import sms_scheduler
        sms_scheduler.stop()
        logger.info("SMS scheduler stopped")
    except Exception as e:
        logger.warning(f"Error stopping schedulers: {e}")


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

# Add Security Headers Middleware (FIRST - before CORS)
app.add_middleware(SecurityHeadersMiddleware)

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
    expose_headers=["X-Data-Classification", "X-Content-Type-Options"]  # Expose security headers
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
# Registration and Invitations (no auth required for some endpoints)
app.include_router(registration_router)
app.include_router(invitations_router)
logger.info("✅ Registration and Invitation routes registered")

app.include_router(
    auth_router,
    prefix="/api/auth",
    tags=["Authentication"]
)

app.include_router(
    team_router,
    tags=["Team"]
    # No dependencies here - router already has prefix and endpoints have their own auth
)
logger.info("✅ Team Management routes registered at /api/team")

app.include_router(
    teams_router,
    prefix="/api/teams",
    tags=["Teams"],
    dependencies=[Depends(get_current_user)]
)
logger.info("✅ Teams Management routes registered at /api/teams")

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

# Register admin analytics routes with the correct prefix
# NO dependencies - permission check is done inside the endpoint
app.include_router(
    admin_analytics_router,
    prefix="/api",  # Router has /admin-analytics prefix, so final URL is /api/admin-analytics/dashboard
    tags=["Admin Analytics"]
)
logger.info("✅ Admin Analytics routes registered at /api/admin-analytics/dashboard")

# Add direct debug route for testing admin dashboard access
from app.api.admin_analytics import get_admin_dashboard_analytics
app.add_api_route(
    "/api/debug/admin-dashboard",
    get_admin_dashboard_analytics,
    dependencies=[Depends(get_current_user)],
    methods=["GET"],
    tags=["Debug"]
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

# OLD SMS router - replaced by sms_enhanced_router
# app.include_router(
#     sms_router,
#     prefix="/api/sms",
#     tags=["SMS"],
#     dependencies=[Depends(get_current_user)]
# )

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

# Billing and Subscription Management
app.include_router(billing_router)
logger.info("✅ Billing routes registered")

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

app.include_router(
    quotes_router,
    prefix="/api/quotes",
    tags=["Quotes"],
    dependencies=[Depends(get_current_user)]
)

if sms_enhanced_router:
    app.include_router(
        sms_enhanced_router,
        prefix="/api",
        dependencies=[Depends(get_current_user)]
    )
    logger.info("✅ SMS Enhanced routes registered")
else:
    logger.warning("⚠️ SMS Enhanced router not loaded - skipping registration")

if twilio_sync_router:
    app.include_router(
        twilio_sync_router,
        prefix="/api",
        dependencies=[Depends(get_current_user)]
    )
    logger.info("✅ Twilio Sync routes registered")
else:
    logger.warning("⚠️ Twilio Sync router not loaded - skipping registration")

# Twilio Webhooks (NO AUTH - Twilio needs to call these)
if twilio_webhooks_router:
    app.include_router(
        twilio_webhooks_router,
        prefix="/api"
        # NO dependencies - Twilio webhooks don't have auth
    )
    logger.info("✅ Twilio Webhooks routes registered (public endpoints)")
else:
    logger.warning("⚠️ Twilio Webhooks router not loaded - skipping registration")

# Twilio Device SDK Voice endpoint (PUBLIC - NO AUTH)
# This endpoint must be at /api/twilio/client/voice to match TwiML App configuration
@app.post("/api/twilio/client/voice", response_class=FastAPIResponse)
async def twilio_device_sdk_voice_handler(request: Request, db: Session = Depends(get_db)):
    """
    PUBLIC endpoint for Twilio Device SDK outgoing calls
    This is called by Twilio when a user initiates a call from the browser
    """
    from app.api.twilio_webhooks import handle_device_sdk_outgoing_voice
    return await handle_device_sdk_outgoing_voice(request, db)

logger.info("✅ Twilio Device SDK voice endpoint registered (public)")

# Twilio Client (Browser calling)
if twilio_client_router:
    app.include_router(
        twilio_client_router,
        prefix="/api/twilio/client",
        dependencies=[Depends(get_current_user)]
    )
    logger.info("✅ Twilio Client routes registered at /api/twilio/client")
else:
    logger.warning("⚠️ Twilio Client router not loaded - skipping registration")

# New Phase 2 routers
app.include_router(
    conversations_router,
    prefix="/api",
    dependencies=[Depends(get_current_user)]
)
logger.info("✅ Conversations routes registered")

app.include_router(
    analytics_enhanced_router,
    prefix="/api",
    dependencies=[Depends(get_current_user)]
)
logger.info("✅ Enhanced Analytics routes registered")

app.include_router(
    performance_alerts_router,
    prefix="/api",
    dependencies=[Depends(get_current_user)]
)
logger.info("✅ Performance Alerts routes registered")

app.include_router(
    voice_transcription_router,
    prefix="/api",
    dependencies=[Depends(get_current_user)]
)
logger.info("✅ Voice Transcription routes registered")

app.include_router(
    bulk_email_campaigns_router,
    prefix="/api",
    dependencies=[Depends(get_current_user)]
)
logger.info("✅ Bulk Email Campaigns routes registered")

# Multi-tenant Company Management
app.include_router(
    companies_router,
    dependencies=[Depends(get_current_user)]
)
logger.info("✅ Company Management routes registered")

# Global Search
app.include_router(
    search_router,
    prefix="/api/search",
    tags=["Search"],
    dependencies=[Depends(get_current_user)]
)
logger.info("✅ Global Search routes registered")

# WebSocket for Real-time Updates
app.include_router(
    websocket_router,
    tags=["WebSocket"]
)
logger.info("✅ WebSocket routes registered")

# Support Tickets System
if support_tickets_router:
    app.include_router(
        support_tickets_router,
        prefix="/api",
        dependencies=[Depends(get_current_user)]
    )
    logger.info("✅ Support Tickets routes registered")
else:
    logger.warning("⚠️ Support Tickets router not loaded - skipping registration")

# Custom Fields System
if custom_fields_router:
    app.include_router(
        custom_fields_router,
        prefix="/api"
    )
    logger.info(f"✅ Custom Fields routes registered at /api/custom-fields")
    logger.info(f"   Router routes: {[route.path for route in custom_fields_router.routes]}")
else:
    logger.warning("⚠️ Custom Fields router not loaded - skipping registration")

# Workflow Templates System
if workflow_templates_router:
    app.include_router(
        workflow_templates_router,
        prefix="/api",
        dependencies=[Depends(get_current_user)]
    )
    logger.info("✅ Workflow Templates routes registered")
else:
    logger.warning("⚠️ Workflow Templates router not loaded - skipping registration")

# Register custom error handlers to prevent database query exposure
register_error_handlers(app)
logger.info("✅ Error handlers registered - Database queries protected")


if __name__ == "__main__":
    import os
    # Only use reload in development
    is_dev = os.getenv("ENVIRONMENT", "production") == "development"
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=is_dev,
        log_level="info"
    )

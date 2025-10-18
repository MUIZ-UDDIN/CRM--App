# /var/www/crm-app/crm-app/backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import your routers
from app.api.contacts import router as contacts_router
from app.api.deals import router as deals_router
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.activities import router as activities_router
from app.api.analytics import router as analytics_router
from app.api.pipelines import router as pipelines_router
from app.api.test_router import router as test_router

# FastAPI instance
app = FastAPI(title="Sales CRM API", version="1.0.0")

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://sunstonecrm.com"],  # Add more if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(contacts_router, prefix="/api/contacts")
app.include_router(deals_router, prefix="/api/deals")
app.include_router(auth_router, prefix="/api/auth")
app.include_router(users_router, prefix="/api/users")
app.include_router(activities_router, prefix="/api/activities")
app.include_router(analytics_router, prefix="/api/analytics")
app.include_router(pipelines_router, prefix="/api/pipelines")
app.include_router(test_router, prefix="/api/test")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Sales CRM API", "version": "1.0.0"}

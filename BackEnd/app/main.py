from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.routers import auth, platforms, publishing, inbox, analytics, listening, campaigns
from app.services.scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title="Social Media Automation API",
    description="API for social media management similar to Sprout Social",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(platforms.router, prefix="/api/platforms", tags=["Platform Connections"])
app.include_router(publishing.router, prefix="/api/publishing", tags=["Publishing"])
app.include_router(inbox.router, prefix="/api/inbox", tags=["Smart Inbox"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(listening.router, prefix="/api/listening", tags=["Social Listening"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["Campaigns"])


@app.get("/")
def root():
    return {"message": "Social Media Automation API", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}

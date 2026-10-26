import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.api.v1 import (
    auth,
    dashboard,
    institutions,
    cases,
    overlaps,
    reports,
    imports,
    audit
)
from backend.app.jobs.deadline_scanner import run_deadline_scan

# Initialize scheduler
scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    # Run initial deadline check
    try:
        run_deadline_scan()
    except Exception as e:
        print(f"Warning: Initial deadline scan error: {e}")

    # Schedule periodic deadline scans every 15 minutes
    try:
        scheduler.add_job(run_deadline_scan, "interval", minutes=15, id="deadline_scanner_job", replace_existing=True)
        scheduler.start()
    except Exception as e:
        print(f"Scheduler init notice: {e}")

    yield

    # Shutdown
    if scheduler.running:
        scheduler.shutdown()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Integrated cross-bureau institution complaint oversight and explainable Conflict Radar API for SIH26264.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local frontend and demo tooling
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID & Audit Middleware
@app.middleware("http")
async def audit_and_header_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-MS"] = str(process_time)
    return response

# Global Exception Handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Sanitize: never leak internal stack traces to client
    request_id = getattr(request.state, "request_id", "unknown")
    print(f"[ERROR] [Req {request_id}] Unhandled error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please contact the administrator.",
            "request_id": request_id
        }
    )

# Include API v1 Routers
api_v1_router = FastAPI()
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(institutions.router, prefix=settings.API_V1_STR)
app.include_router(cases.router, prefix=settings.API_V1_STR)
app.include_router(overlaps.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(imports.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to SIH26264 Institution Conflict Radar API",
        "docs": "/docs",
        "health": "/health"
    }

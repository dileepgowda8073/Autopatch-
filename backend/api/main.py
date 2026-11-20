import sys
from pathlib import Path

# Ensure project root is always on sys.path regardless of CWD
_root = str(Path(__file__).resolve().parent.parent.parent)
if _root not in sys.path:
    sys.path.insert(0, _root)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.core.errors import AppError
from backend.models.db import init_db
from backend.api.routers import projects, scans, patches, chat, jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables on startup
    await init_db()
    yield


app = FastAPI(
    title="AutoPatch API",
    description="Autonomous Software Bug Detection and Repair System API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Standard Error Envelope Handler
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_envelope(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": str(exc),
            "details": {"type": type(exc).__name__},
        },
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "AutoPatch API", "version": "0.1.0"}


# Register Routers under /api/v1
app.include_router(projects.router, prefix="/api/v1")
app.include_router(scans.router, prefix="/api/v1")
app.include_router(patches.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import get_settings
from agents.router import router as agents_router
from tools.router import router as tools_router
from skills.youtube_router import router as youtube_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting AI Backend...")
    yield
    # Shutdown
    print("Shutting down AI Backend...")


app = FastAPI(
    title="Glowus AI Backend",
    description="Python AI Backend for Agent Execution",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(agents_router, prefix="/api/agents", tags=["agents"])
app.include_router(tools_router, prefix="/api/tools", tags=["tools"])
app.include_router(youtube_router, prefix="/api/youtube", tags=["youtube"])


@app.get("/")
async def root():
    return {"status": "ok", "message": "Glowus AI Backend"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )

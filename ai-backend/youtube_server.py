"""
YouTube Transcript Server
독립 실행 가능한 YouTube 자막 추출 서버
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from skills.youtube_router import router as youtube_router
import os

app = FastAPI(
    title="YouTube Transcript Server",
    description="YouTube 자막 추출 및 AI 요약 서버",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router
app.include_router(youtube_router, prefix="/api/youtube", tags=["youtube"])


@app.get("/")
async def root():
    return {"status": "ok", "message": "YouTube Transcript Server"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8002))
    uvicorn.run(
        "youtube_server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )

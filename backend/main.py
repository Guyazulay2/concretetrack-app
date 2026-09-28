import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth     import router as auth_router
from api.entries  import router as entries_router
from api.users    import router as users_router
from api.stats    import router as stats_router
from api.activity import router as activity_router
from models.database import init_db, get_db

# ריק = אין CORS (frontend ו-API על אותו דומיין, כמו בקלאסטר)
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "https://concretetrack-frontend.vercel.app").split(",") if o.strip()]

@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield

app = FastAPI(title="ConcreteTrack API", version="2.0.0", lifespan=lifespan)
if CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router,     prefix="/api/auth")
app.include_router(entries_router,  prefix="/api/entries")
app.include_router(users_router,    prefix="/api/users")
app.include_router(stats_router,    prefix="/api/stats")
app.include_router(activity_router, prefix="/api/activity")

# /metrics - נחשף רק בתוך הקלאסטר (ה-Gateway מנתב החוצה רק /api)
Instrumentator(excluded_handlers=["/health", "/healthz", "/readyz", "/metrics"]).instrument(app).expose(app, include_in_schema=False)

@app.get("/health")
async def health(): return {"status": "ok"}

# liveness - התהליך חי (בלי DB, כדי ש-DB איטי לא יגרום ל-restart)
@app.get("/healthz", include_in_schema=False)
async def healthz(): return {"status": "ok"}

# readiness - מוכן לקבל תעבורה (כולל DB)
@app.get("/readyz", include_in_schema=False)
async def readyz(response: Response, db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        response.status_code = 503
        return {"status": "db-unavailable"}
    return {"status": "ready"}

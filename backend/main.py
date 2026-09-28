from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.auth     import router as auth_router
from api.entries  import router as entries_router
from api.users    import router as users_router
from api.stats    import router as stats_router
from api.activity import router as activity_router
from models.database import init_db

@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield

app = FastAPI(title="ConcreteTrack API", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["https://concretetrack-frontend.vercel.app"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router,     prefix="/api/auth")
app.include_router(entries_router,  prefix="/api/entries")
app.include_router(users_router,    prefix="/api/users")
app.include_router(stats_router,    prefix="/api/stats")
app.include_router(activity_router, prefix="/api/activity")

@app.get("/health")
async def health(): return {"status": "ok"}

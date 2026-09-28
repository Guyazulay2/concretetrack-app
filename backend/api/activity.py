"""
Activity log API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from models.database import ActivityLog, get_db
from api.auth import require_admin, User

router = APIRouter()

class LogOut(BaseModel):
    id: int
    action: str
    description: str
    created_at: datetime
    model_config = {"from_attributes": True}

@router.get("/", response_model=list[LogOut])
async def get_logs(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(100)
    )
    return result.scalars().all()

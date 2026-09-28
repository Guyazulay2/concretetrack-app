"""
Stats API - סטטיסטיקות לדשבורד
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from models.database import Entry, EntryStatus, Region, get_db
from api.auth import get_current_user, require_admin
from models.database import User

router = APIRouter()

@router.get("/dashboard")
async def dashboard_stats(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    urgent_threshold = now - timedelta(hours=24)

    # סה"כ פעילות (ממתינות בלבד)
    active_q = await db.execute(
        select(func.count(Entry.id)).where(
            Entry.status == EntryStatus.WAITING
        )
    )
    active = active_q.scalar()

    # ממתינות לאיסוף
    waiting = active

    # נאספו היום
    collected_today_q = await db.execute(
        select(func.count(Entry.id)).where(
            Entry.status == EntryStatus.COLLECTED,
            Entry.collected_at >= today_start
        )
    )
    collected_today = collected_today_q.scalar()

    # דחופות — ממתינות מעל 24 שעות
    urgent_q = await db.execute(
        select(func.count(Entry.id)).where(
            Entry.status == EntryStatus.WAITING,
            Entry.created_at <= urgent_threshold
        )
    )
    urgent = urgent_q.scalar()

    # לפי אזור
    by_region = {}
    for region in Region:
        r_q = await db.execute(
            select(func.count(Entry.id)).where(
                Entry.region == region,
                Entry.status.in_([EntryStatus.WAITING, EntryStatus.COLLECTED])
            )
        )
        by_region[region.value] = r_q.scalar()

    return {
        "active": active,
        "waiting": waiting,
        "collected_today": collected_today,
        "urgent": urgent,
        "by_region": by_region
    }

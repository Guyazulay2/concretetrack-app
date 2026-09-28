"""
Entries API
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import uuid

from models.database import Entry, EntryStatus, Region, ActivityLog, User, get_db
from api.auth import get_current_user, require_admin
from services.s3 import upload_to_s3, get_presigned_url, delete_from_s3
from services.alerts import send_status_alert

router = APIRouter()

class EntryCreate(BaseModel):
    region: Region
    city: str
    location_desc: str
    notes: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class CollectRequest(BaseModel):
    collector_name: str
    notes: Optional[str] = None

class EntryOut(BaseModel):
    id: int
    region: str
    city: str
    location_desc: str
    notes: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    status: str
    media_url: Optional[str] = None
    media_type: Optional[str]
    hours_waiting: Optional[float] = None
    created_at: datetime
    collected_at: Optional[datetime]
    collector_name: Optional[str]
    inspector_name: str
    model_config = {"from_attributes": True}

async def _log(db, user_id, entry_id, action, desc):
    log = ActivityLog(user_id=user_id, entry_id=entry_id, action=action, description=desc)
    db.add(log)
    await db.commit()

async def _to_out(entry, db):
    media_url = None
    if entry.media_s3_key:
        media_url = await get_presigned_url(entry.media_s3_key)
    hours = (datetime.utcnow() - entry.created_at).total_seconds() / 3600
    return EntryOut(
        id=entry.id,
        region=entry.region.value,
        city=entry.city,
        location_desc=entry.location_desc,
        notes=entry.notes,
        lat=entry.lat,
        lng=entry.lng,
        status=entry.status.value,
        media_url=media_url,
        media_type=entry.media_type,
        hours_waiting=hours,
        created_at=entry.created_at,
        collected_at=entry.collected_at,
        collector_name=entry.collector_name,
        inspector_name=entry.inspector.full_name if entry.inspector else "לא ידוע"
    )

@router.post("/", response_model=EntryOut)
async def create_entry(data: EntryCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    entry = Entry(inspector_id=user.id, region=data.region, city=data.city,
                  location_desc=data.location_desc, notes=data.notes, lat=data.lat, lng=data.lng)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    await _log(db, user.id, entry.id, "created", f"{user.full_name} תיעד הכנה ב{data.city}")
    return await _to_out(entry, db)

@router.post("/{entry_id}/media")
async def upload_media(entry_id: int, file: UploadFile = File(...), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Entry).where(Entry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "רשומה לא נמצאה")
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    s3_key = f"entries/{entry_id}/{uuid.uuid4().hex}.{ext}"
    content = await file.read()
    if not content:
        raise HTTPException(400, "הקובץ ריק")
    media_type = "video" if (file.content_type or "").startswith("video") else "image"
    await upload_to_s3(s3_key, content, file.content_type or "application/octet-stream")
    entry.media_s3_key = s3_key
    entry.media_type = media_type
    await db.commit()
    media_url = await get_presigned_url(s3_key)
    return {"s3_key": s3_key, "media_type": media_type, "media_url": media_url}

@router.post("/{entry_id}/collect")
async def mark_collected(entry_id: int, data: CollectRequest, background: BackgroundTasks, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Entry).where(Entry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "רשומה לא נמצאה")
    if entry.status == EntryStatus.COLLECTED:
        raise HTTPException(400, "כבר נאספה")
    entry.status = EntryStatus.COLLECTED
    entry.collected_by_id = user.id
    entry.collected_at = datetime.utcnow()
    entry.collector_name = data.collector_name
    await db.commit()
    await _log(db, user.id, entry_id, "collected", f"{data.collector_name} אסף מ{entry.city}")
    background.add_task(send_status_alert, entry, "collected")
    return {"ok": True}

@router.get("/by-region")
async def entries_by_region(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """רק ממתינות — לוח ראשי"""
    result = {}
    for region in Region:
        q = select(Entry).where(
            Entry.region == region,
            Entry.status == EntryStatus.WAITING
        )
        if user.role.value == "inspector":
            q = q.where(Entry.inspector_id == user.id)
        q = q.order_by(Entry.created_at.desc())
        res = await db.execute(q)
        entries = res.scalars().all()
        result[region.value] = [await _to_out(e, db) for e in entries]
    return result

@router.get("/collected")
async def list_collected(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """נאספות — דף היסטוריה"""
    q = select(Entry).where(Entry.status == EntryStatus.COLLECTED)
    if user.role.value == "inspector":
        q = q.where(Entry.inspector_id == user.id)
    q = q.order_by(Entry.collected_at.desc())
    result = await db.execute(q)
    entries = result.scalars().all()
    return [await _to_out(e, db) for e in entries]

@router.get("/")
async def list_entries(region: Optional[str] = None, status: Optional[str] = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    q = select(Entry)
    if user.role.value == "inspector":
        q = q.where(Entry.inspector_id == user.id)
    if region:
        q = q.where(Entry.region == Region(region))
    if status:
        q = q.where(Entry.status == EntryStatus(status))
    q = q.order_by(Entry.created_at.desc())
    result = await db.execute(q)
    entries = result.scalars().all()
    return [await _to_out(e, db) for e in entries]

@router.delete("/{entry_id}")
async def delete_entry(entry_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """מחיקה מוחלטת — מוחק מהDB ומ-S3"""
    result = await db.execute(select(Entry).where(Entry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "לא נמצא")
    if user.role.value == "inspector" and entry.inspector_id != user.id:
        raise HTTPException(403, "אין הרשאה")
    if entry.media_s3_key:
        await delete_from_s3(entry.media_s3_key)
    await db.delete(entry)
    await db.commit()
    return {"ok": True}

@router.patch("/{entry_id}/cancel")
async def cancel_entry(entry_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """ביטול = מחיקה מוחלטת"""
    result = await db.execute(select(Entry).where(Entry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "לא נמצא")
    if user.role.value == "inspector" and entry.inspector_id != user.id:
        raise HTTPException(403, "אין הרשאה")
    if entry.media_s3_key:
        await delete_from_s3(entry.media_s3_key)
    await db.delete(entry)
    await db.commit()
    return {"ok": True}

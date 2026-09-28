from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from models.database import User, UserRole, get_db, hash_password
from api.auth import require_admin

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: UserRole = UserRole.INSPECTOR

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    is_active: bool
    model_config = {"from_attributes": True}

@router.get("/", response_model=list[UserOut])
async def list_users(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()

@router.post("/", response_model=UserOut)
async def create_user(data: UserCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    exists = await db.execute(select(User).where(User.username == data.username))
    if exists.scalar_one_or_none():
        raise HTTPException(400, "שם המשתמש כבר קיים")
    user = User(username=data.username, password_hash=hash_password(data.password), full_name=data.full_name, role=data.role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/{user_id}/deactivate")
async def deactivate_user(user_id: int, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "משתמש לא נמצא")
    user.is_active = False
    await db.commit()
    return {"ok": True}

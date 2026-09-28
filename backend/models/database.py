from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped, relationship
from sqlalchemy import String, DateTime, Enum, ForeignKey, Float, Text, Boolean
from datetime import datetime
from typing import Optional
import enum
import os
import bcrypt

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./concretetrack.db")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class Region(str, enum.Enum):
    NORTH  = "north"
    CENTER = "center"
    SOUTH  = "south"

class EntryStatus(str, enum.Enum):
    WAITING   = "waiting"
    COLLECTED = "collected"
    CANCELLED = "cancelled"

class UserRole(str, enum.Enum):
    INSPECTOR = "inspector"
    ADMIN     = "admin"

class User(Base):
    __tablename__ = "users"
    id:            Mapped[int]      = mapped_column(primary_key=True)
    username:      Mapped[str]      = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str]      = mapped_column(String(256))
    full_name:     Mapped[str]      = mapped_column(String(100))
    role:          Mapped[UserRole] = mapped_column(Enum(UserRole))
    is_active:     Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:    Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    entries:     Mapped[list["Entry"]] = relationship(back_populates="inspector",         foreign_keys="Entry.inspector_id")
    collections: Mapped[list["Entry"]] = relationship(back_populates="collected_by_user", foreign_keys="Entry.collected_by_id")

class Entry(Base):
    __tablename__ = "entries"
    id:            Mapped[int]           = mapped_column(primary_key=True)
    inspector_id:  Mapped[int]           = mapped_column(ForeignKey("users.id"))
    region:        Mapped[Region]        = mapped_column(Enum(Region), index=True)
    city:          Mapped[str]           = mapped_column(String(100))
    location_desc: Mapped[str]           = mapped_column(String(300))
    notes:         Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lat:           Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng:           Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # S3 storage
    media_s3_key:  Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    media_type:    Mapped[Optional[str]] = mapped_column(String(10),  nullable=True)
    status:        Mapped[EntryStatus]   = mapped_column(Enum(EntryStatus), default=EntryStatus.WAITING, index=True)
    created_at:    Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)
    collected_by_id: Mapped[Optional[int]]     = mapped_column(ForeignKey("users.id"), nullable=True)
    collected_at:    Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    collector_name:  Mapped[Optional[str]]      = mapped_column(String(100), nullable=True)
    collect_notes:   Mapped[Optional[str]]      = mapped_column(Text, nullable=True)
    inspector:         Mapped[User]           = relationship(back_populates="entries",      foreign_keys=[inspector_id])
    collected_by_user: Mapped[Optional[User]] = relationship(back_populates="collections", foreign_keys=[collected_by_id])

class ActivityLog(Base):
    __tablename__ = "activity_log"
    id:          Mapped[int]           = mapped_column(primary_key=True)
    user_id:     Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    entry_id:    Mapped[Optional[int]] = mapped_column(ForeignKey("entries.id"), nullable=True)
    action:      Mapped[str]           = mapped_column(String(50))
    description: Mapped[str]           = mapped_column(Text)
    created_at:  Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _seed_users()

async def _seed_users():
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        if (await session.execute(select(User).limit(1))).first():
            return
        session.add_all([
            User(username="inspector", password_hash=hash_password("1234"),     full_name="בודק שטח",  role=UserRole.INSPECTOR),
            User(username="admin",     password_hash=hash_password("admin123"), full_name="סדרן ראשי", role=UserRole.ADMIN),
        ])
        await session.commit()
        print("✅ Seeded default users")

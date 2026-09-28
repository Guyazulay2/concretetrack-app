from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import os

from models.database import User, get_db, verify_password

router = APIRouter()
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SECRET = os.environ.get("JWT_SECRET", "")
if len(SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be set and at least 32 characters long")
ALGO   = "HS256"
TTL    = 24

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    model_config = {"from_attributes": True}

def create_token(user_id: int, role: str) -> str:
    exp = datetime.utcnow() + timedelta(hours=TTL)
    return jwt.encode({"sub": str(user_id), "role": role, "exp": exp}, SECRET, algorithm=ALGO)

async def get_current_user(token: str = Depends(oauth2), db: AsyncSession = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token לא תקין")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="משתמש לא נמצא")
    return user

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role.value != "admin":
        raise HTTPException(status_code=403, detail="גישה מורשית לסדרנים בלבד")
    return user

@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="שם משתמש או סיסמא שגויים")
    token = create_token(user.id, user.role.value)
    return TokenResponse(access_token=token, token_type="bearer", role=user.role.value, full_name=user.full_name)

@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user

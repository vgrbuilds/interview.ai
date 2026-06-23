from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.database.models import User
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse
from app.services.supabase_client import get_supabase, is_mock_supabase

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    supabase = get_supabase()
    try:
        res = supabase.auth.get_user(token)
        sb_user = res.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check/Sync user to local database
    stmt = select(User).where(User.id == sb_user.id)
    result = await db.execute(stmt)
    db_user = result.scalars().first()
    
    if not db_user:
        name = getattr(sb_user, "user_metadata", {}).get("name", "Candidate")
        db_user = User(
            id=sb_user.id,
            email=sb_user.email,
            name=name
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
    return db_user


@router.post("/signup", response_model=TokenResponse)
async def signup(body: UserCreate, db: AsyncSession = Depends(get_db)):
    supabase = get_supabase()
    try:
        # In real Supabase, sign_up expects email and password
        if is_mock_supabase:
            res = supabase.auth.sign_up({"email": body.email, "password": body.password, "options": {"data": {"name": body.name}}})
            user_data = res["user"]
            session_data = res["session"]
            user_id = user_data["id"]
            user_email = user_data["email"]
            user_name = user_data["user_metadata"]["name"]
            access_token = session_data["access_token"]
        else:
            res = supabase.auth.sign_up({
                "email": body.email,
                "password": body.password,
                "options": {
                    "data": {
                        "name": body.name
                    }
                }
            })
            # Real response parsing depends on version, typically:
            user_id = res.user.id
            user_email = res.user.email
            user_name = res.user.user_metadata.get("name", body.name)
            access_token = res.session.access_token
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {str(e)}"
        )
    
    # Check if user already exists locally
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    db_user = result.scalars().first()
    
    if not db_user:
        db_user = User(
            id=user_id,
            email=user_email,
            name=user_name
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=db_user.id,
            email=db_user.email,
            name=db_user.name,
            created_at=db_user.created_at
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    supabase = get_supabase()
    try:
        if is_mock_supabase:
            res = supabase.auth.sign_in_with_password({"email": body.email, "password": body.password})
            user_data = res["user"]
            session_data = res["session"]
            user_id = user_data["id"]
            user_email = user_data["email"]
            user_name = user_data["user_metadata"]["name"]
            access_token = session_data["access_token"]
        else:
            res = supabase.auth.sign_in_with_password({
                "email": body.email,
                "password": body.password
            })
            user_id = res.user.id
            user_email = res.user.email
            user_name = res.user.user_metadata.get("name", "Candidate")
            access_token = res.session.access_token
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )
        
    # Sync to local database if not exists
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    db_user = result.scalars().first()
    
    if not db_user:
        db_user = User(
            id=user_id,
            email=user_email,
            name=user_name
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=db_user.id,
            email=db_user.email,
            name=db_user.name,
            created_at=db_user.created_at
        )
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        created_at=current_user.created_at
    )

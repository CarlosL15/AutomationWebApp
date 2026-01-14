from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import User, PlatformConnection
from app.schemas import PlatformConnectionCreate, PlatformConnectionResponse
from app.routers.auth import get_current_user
from app.services.platform_api import platform_api_service

router = APIRouter()

SUPPORTED_PLATFORMS = ["tiktok", "instagram", "youtube", "facebook"]


@router.get("/", response_model=List[PlatformConnectionResponse])
def get_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all platform connections for current user"""
    connections = db.query(PlatformConnection).filter(
        PlatformConnection.user_id == current_user.id
    ).all()
    return connections


@router.get("/supported")
def get_supported_platforms():
    """Get list of supported platforms"""
    return {"platforms": SUPPORTED_PLATFORMS}


@router.post("/connect", response_model=PlatformConnectionResponse)
async def connect_platform(
    connection_data: PlatformConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect a social media platform"""
    if connection_data.platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported platform. Supported: {SUPPORTED_PLATFORMS}"
        )
    
    # Check if already connected
    existing = db.query(PlatformConnection).filter(
        PlatformConnection.user_id == current_user.id,
        PlatformConnection.platform == connection_data.platform
    ).first()
    
    if existing:
        # Update existing connection
        existing.access_token = connection_data.access_token
        existing.refresh_token = connection_data.refresh_token
        existing.is_active = True
        existing.connected_at = datetime.utcnow()
        
        # Try to get user info from platform
        user_info = await get_platform_user_info(
            connection_data.platform,
            connection_data.access_token
        )
        if user_info:
            existing.platform_user_id = user_info.get("id")
            existing.platform_username = user_info.get("username")
        
        db.commit()
        db.refresh(existing)
        return existing
    
    # Get user info from platform
    user_info = await get_platform_user_info(
        connection_data.platform,
        connection_data.access_token
    )
    
    # Create new connection
    connection = PlatformConnection(
        user_id=current_user.id,
        platform=connection_data.platform,
        access_token=connection_data.access_token,
        refresh_token=connection_data.refresh_token,
        platform_user_id=user_info.get("id") if user_info else connection_data.platform_user_id,
        platform_username=user_info.get("username") if user_info else connection_data.platform_username
    )
    
    db.add(connection)
    db.commit()
    db.refresh(connection)
    
    return connection


@router.delete("/{platform}")
def disconnect_platform(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect a social media platform"""
    connection = db.query(PlatformConnection).filter(
        PlatformConnection.user_id == current_user.id,
        PlatformConnection.platform == platform
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platform connection not found"
        )
    
    db.delete(connection)
    db.commit()
    
    return {"message": f"{platform} disconnected successfully"}


@router.put("/{platform}/toggle")
def toggle_platform(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle platform active status"""
    connection = db.query(PlatformConnection).filter(
        PlatformConnection.user_id == current_user.id,
        PlatformConnection.platform == platform
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platform connection not found"
        )
    
    connection.is_active = not connection.is_active
    db.commit()
    
    return {"message": f"{platform} {'activated' if connection.is_active else 'deactivated'}"}


@router.get("/{platform}/status")
async def get_platform_status(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get connection status for a platform"""
    connection = db.query(PlatformConnection).filter(
        PlatformConnection.user_id == current_user.id,
        PlatformConnection.platform == platform
    ).first()
    
    if not connection:
        return {
            "platform": platform,
            "connected": False,
            "is_active": False
        }
    
    # Verify token is still valid
    is_valid = await verify_platform_token(platform, connection.access_token)
    
    return {
        "platform": platform,
        "connected": True,
        "is_active": connection.is_active,
        "username": connection.platform_username,
        "token_valid": is_valid
    }


async def get_platform_user_info(platform: str, access_token: str) -> dict:
    """Get user info from platform API"""
    try:
        if platform == "tiktok":
            result = await platform_api_service.tiktok_get_user_info(access_token)
            data = result.get("data", {}).get("user", {})
            return {
                "id": data.get("open_id"),
                "username": data.get("display_name")
            }
        
        elif platform == "youtube":
            result = await platform_api_service.youtube_get_channel_stats(access_token)
            items = result.get("items", [])
            if items:
                snippet = items[0].get("snippet", {})
                return {
                    "id": items[0].get("id"),
                    "username": snippet.get("title")
                }
        
        elif platform in ["instagram", "facebook"]:
            # These use Facebook Graph API
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://graph.facebook.com/v18.0/me",
                    params={"access_token": access_token}
                )
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "id": data.get("id"),
                        "username": data.get("name")
                    }
    except Exception:
        pass
    
    return None


async def verify_platform_token(platform: str, access_token: str) -> bool:
    """Verify if platform token is still valid"""
    try:
        user_info = await get_platform_user_info(platform, access_token)
        return user_info is not None
    except Exception:
        return False

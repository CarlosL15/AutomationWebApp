from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import User, InboxMessage, InboxReply, PlatformConnection
from app.schemas import InboxMessageResponse, InboxReplyCreate, InboxReplyResponse
from app.routers.auth import get_current_user
from app.services.platform_api import platform_api_service

router = APIRouter()


@router.get("/messages", response_model=List[InboxMessageResponse])
def get_messages(
    platform: Optional[str] = Query(None, description="Filter by platform"),
    message_type: Optional[str] = Query(None, description="Filter by type: comment, dm, mention, reply"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment: positive, negative, neutral"),
    search: Optional[str] = Query(None, description="Search in message content"),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all inbox messages with filters"""
    query = db.query(InboxMessage).filter(
        InboxMessage.user_id == current_user.id
    )
    
    if platform:
        query = query.filter(InboxMessage.platform == platform)
    if message_type:
        query = query.filter(InboxMessage.message_type == message_type)
    if is_read is not None:
        query = query.filter(InboxMessage.is_read == is_read)
    if sentiment:
        query = query.filter(InboxMessage.sentiment == sentiment)
    if search:
        query = query.filter(
            or_(
                InboxMessage.content.ilike(f"%{search}%"),
                InboxMessage.sender_username.ilike(f"%{search}%")
            )
        )
    
    messages = query.order_by(InboxMessage.received_at.desc()).offset(offset).limit(limit).all()
    return messages


@router.get("/messages/unread")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unread message counts by platform"""
    counts = db.query(
        InboxMessage.platform,
        func.count(InboxMessage.id).label("count")
    ).filter(
        InboxMessage.user_id == current_user.id,
        InboxMessage.is_read == False
    ).group_by(InboxMessage.platform).all()
    
    total = sum(c.count for c in counts)
    by_platform = {c.platform: c.count for c in counts}
    
    return {
        "total_unread": total,
        "by_platform": by_platform
    }


@router.get("/messages/{message_id}", response_model=InboxMessageResponse)
def get_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific message"""
    message = db.query(InboxMessage).filter(
        InboxMessage.id == message_id,
        InboxMessage.user_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    return message


@router.put("/messages/{message_id}/read")
def mark_as_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a message as read"""
    message = db.query(InboxMessage).filter(
        InboxMessage.id == message_id,
        InboxMessage.user_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    message.is_read = True
    db.commit()
    
    return {"message": "Marked as read"}


@router.put("/messages/read-all")
def mark_all_as_read(
    platform: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all messages as read"""
    query = db.query(InboxMessage).filter(
        InboxMessage.user_id == current_user.id,
        InboxMessage.is_read == False
    )
    
    if platform:
        query = query.filter(InboxMessage.platform == platform)
    
    count = query.update({"is_read": True})
    db.commit()
    
    return {"message": f"Marked {count} messages as read"}


@router.post("/messages/{message_id}/reply", response_model=InboxReplyResponse)
async def reply_to_message(
    message_id: int,
    reply_data: InboxReplyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reply to an inbox message"""
    message = db.query(InboxMessage).filter(
        InboxMessage.id == message_id,
        InboxMessage.user_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Get platform connection
    connection = db.query(PlatformConnection).filter(
        PlatformConnection.user_id == current_user.id,
        PlatformConnection.platform == message.platform,
        PlatformConnection.is_active == True
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No active connection for {message.platform}"
        )
    
    # Send reply via platform API
    status_value = "sent"
    try:
        await send_platform_reply(
            platform=message.platform,
            access_token=connection.access_token,
            message=message,
            reply_content=reply_data.content
        )
    except Exception as e:
        status_value = "failed"
    
    # Store reply
    reply = InboxReply(
        inbox_message_id=message_id,
        user_id=current_user.id,
        content=reply_data.content,
        status=status_value
    )
    
    db.add(reply)
    message.is_replied = True
    db.commit()
    db.refresh(reply)
    
    return reply


@router.get("/messages/{message_id}/replies", response_model=List[InboxReplyResponse])
def get_message_replies(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get replies to a message"""
    message = db.query(InboxMessage).filter(
        InboxMessage.id == message_id,
        InboxMessage.user_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    replies = db.query(InboxReply).filter(
        InboxReply.inbox_message_id == message_id
    ).order_by(InboxReply.sent_at.desc()).all()
    
    return replies


@router.get("/stats")
def get_inbox_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get inbox statistics"""
    # Total messages
    total = db.query(func.count(InboxMessage.id)).filter(
        InboxMessage.user_id == current_user.id
    ).scalar()
    
    # Unread
    unread = db.query(func.count(InboxMessage.id)).filter(
        InboxMessage.user_id == current_user.id,
        InboxMessage.is_read == False
    ).scalar()
    
    # By sentiment
    sentiment_counts = db.query(
        InboxMessage.sentiment,
        func.count(InboxMessage.id).label("count")
    ).filter(
        InboxMessage.user_id == current_user.id
    ).group_by(InboxMessage.sentiment).all()
    
    # By type
    type_counts = db.query(
        InboxMessage.message_type,
        func.count(InboxMessage.id).label("count")
    ).filter(
        InboxMessage.user_id == current_user.id
    ).group_by(InboxMessage.message_type).all()
    
    # Response rate
    replied = db.query(func.count(InboxMessage.id)).filter(
        InboxMessage.user_id == current_user.id,
        InboxMessage.is_replied == True
    ).scalar()
    
    response_rate = (replied / total * 100) if total > 0 else 0
    
    return {
        "total_messages": total,
        "unread_messages": unread,
        "by_sentiment": {s.sentiment: s.count for s in sentiment_counts if s.sentiment},
        "by_type": {t.message_type: t.count for t in type_counts},
        "response_rate": round(response_rate, 2)
    }


@router.post("/sync")
async def sync_inbox(
    platform: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger inbox sync"""
    from app.services.scheduler import sync_platform_messages
    
    query = db.query(PlatformConnection).filter(
        PlatformConnection.user_id == current_user.id,
        PlatformConnection.is_active == True
    )
    
    if platform:
        query = query.filter(PlatformConnection.platform == platform)
    
    connections = query.all()
    synced = []
    
    for connection in connections:
        try:
            await sync_platform_messages(db, connection)
            synced.append(connection.platform)
        except Exception as e:
            pass
    
    db.commit()
    
    return {"message": f"Synced {len(synced)} platforms", "platforms": synced}


async def send_platform_reply(
    platform: str,
    access_token: str,
    message: InboxMessage,
    reply_content: str
):
    """Send reply via platform API"""
    if platform == "facebook":
        if message.message_type == "comment":
            await platform_api_service.facebook_reply_to_comment(
                access_token=access_token,
                comment_id=message.external_message_id,
                message=reply_content
            )
    # Add more platform-specific reply logic as needed

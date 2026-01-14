from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import User, ScheduledPost, PlatformConnection
from app.schemas import (
    ScheduledPostCreate,
    ScheduledPostUpdate,
    ScheduledPostResponse,
    OptimalTimeSuggestion
)
from app.routers.auth import get_current_user
from app.services.optimal_time import optimal_time_service

router = APIRouter()


@router.get("/posts", response_model=List[ScheduledPostResponse])
def get_posts(
    status: Optional[str] = Query(None, description="Filter by status"),
    platform: Optional[str] = Query(None, description="Filter by platform"),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all scheduled posts for current user"""
    query = db.query(ScheduledPost).filter(
        ScheduledPost.user_id == current_user.id
    )
    
    if status:
        query = query.filter(ScheduledPost.status == status)
    if platform:
        query = query.filter(ScheduledPost.platform == platform)
    
    posts = query.order_by(ScheduledPost.scheduled_time.desc()).offset(offset).limit(limit).all()
    return posts


@router.get("/posts/{post_id}", response_model=ScheduledPostResponse)
def get_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific scheduled post"""
    post = db.query(ScheduledPost).filter(
        ScheduledPost.id == post_id,
        ScheduledPost.user_id == current_user.id
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    return post


@router.post("/posts", response_model=ScheduledPostResponse)
def create_post(
    post_data: ScheduledPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new scheduled post"""
    # Verify platform is connected
    connection = db.query(PlatformConnection).filter(
        PlatformConnection.user_id == current_user.id,
        PlatformConnection.platform == post_data.platform,
        PlatformConnection.is_active == True
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No active connection for {post_data.platform}"
        )
    
    # Calculate optimal time if requested
    optimal_time = None
    scheduled_time = post_data.scheduled_time
    
    if post_data.use_optimal_time:
        optimal_time = optimal_time_service.suggest_optimal_time(
            db=db,
            user_id=current_user.id,
            platform=post_data.platform,
            preferred_date=post_data.scheduled_time
        )
        scheduled_time = optimal_time
    
    # Create post
    post = ScheduledPost(
        user_id=current_user.id,
        platform=post_data.platform,
        content=post_data.content,
        media_urls=post_data.media_urls,
        scheduled_time=scheduled_time,
        optimal_time_suggested=optimal_time,
        status="scheduled"
    )
    
    db.add(post)
    db.commit()
    db.refresh(post)
    
    return post


@router.put("/posts/{post_id}", response_model=ScheduledPostResponse)
def update_post(
    post_id: int,
    post_data: ScheduledPostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a scheduled post"""
    post = db.query(ScheduledPost).filter(
        ScheduledPost.id == post_id,
        ScheduledPost.user_id == current_user.id
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    if post.status == "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update published post"
        )
    
    if post_data.content is not None:
        post.content = post_data.content
    if post_data.scheduled_time is not None:
        post.scheduled_time = post_data.scheduled_time
    if post_data.status is not None:
        post.status = post_data.status
    
    db.commit()
    db.refresh(post)
    
    return post


@router.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a scheduled post"""
    post = db.query(ScheduledPost).filter(
        ScheduledPost.id == post_id,
        ScheduledPost.user_id == current_user.id
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    db.delete(post)
    db.commit()
    
    return {"message": "Post deleted successfully"}


@router.get("/calendar")
def get_calendar(
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get posts for calendar view"""
    posts = db.query(ScheduledPost).filter(
        ScheduledPost.user_id == current_user.id,
        ScheduledPost.scheduled_time >= start_date,
        ScheduledPost.scheduled_time <= end_date
    ).all()
    
    # Group by date
    calendar = {}
    for post in posts:
        date_key = post.scheduled_time.strftime("%Y-%m-%d")
        if date_key not in calendar:
            calendar[date_key] = []
        calendar[date_key].append({
            "id": post.id,
            "platform": post.platform,
            "content": post.content[:100] + "..." if len(post.content) > 100 else post.content,
            "time": post.scheduled_time.strftime("%H:%M"),
            "status": post.status
        })
    
    return calendar


@router.get("/optimal-times/{platform}", response_model=OptimalTimeSuggestion)
def get_optimal_times(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get optimal posting times for a platform"""
    times = optimal_time_service.get_optimal_times(
        db=db,
        user_id=current_user.id,
        platform=platform,
        count=10
    )
    
    return OptimalTimeSuggestion(
        platform=platform,
        suggested_times=times
    )


@router.get("/optimal-times/{platform}/heatmap")
def get_optimal_times_heatmap(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get posting times heatmap for a platform"""
    heatmap = optimal_time_service.get_posting_heatmap(
        db=db,
        user_id=current_user.id,
        platform=platform
    )
    
    return {
        "platform": platform,
        "heatmap": heatmap,
        "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "hours": list(range(24))
    }


@router.post("/posts/{post_id}/duplicate", response_model=ScheduledPostResponse)
def duplicate_post(
    post_id: int,
    target_platform: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Duplicate a post, optionally to another platform"""
    original = db.query(ScheduledPost).filter(
        ScheduledPost.id == post_id,
        ScheduledPost.user_id == current_user.id
    ).first()
    
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    platform = target_platform or original.platform
    
    # Verify platform connection
    connection = db.query(PlatformConnection).filter(
        PlatformConnection.user_id == current_user.id,
        PlatformConnection.platform == platform,
        PlatformConnection.is_active == True
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No active connection for {platform}"
        )
    
    # Create duplicate
    new_post = ScheduledPost(
        user_id=current_user.id,
        platform=platform,
        content=original.content,
        media_urls=original.media_urls,
        scheduled_time=datetime.utcnow(),  # Reset time
        status="draft"
    )
    
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    return new_post


@router.get("/drafts", response_model=List[ScheduledPostResponse])
def get_drafts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all draft posts"""
    drafts = db.query(ScheduledPost).filter(
        ScheduledPost.user_id == current_user.id,
        ScheduledPost.status == "draft"
    ).order_by(ScheduledPost.created_at.desc()).all()
    
    return drafts


@router.get("/queue")
def get_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get upcoming scheduled posts queue"""
    posts = db.query(ScheduledPost).filter(
        ScheduledPost.user_id == current_user.id,
        ScheduledPost.status == "scheduled",
        ScheduledPost.scheduled_time >= datetime.utcnow()
    ).order_by(ScheduledPost.scheduled_time.asc()).limit(20).all()
    
    queue = []
    for post in posts:
        queue.append({
            "id": post.id,
            "platform": post.platform,
            "content": post.content[:100] + "..." if len(post.content) > 100 else post.content,
            "scheduled_time": post.scheduled_time,
            "time_until": str(post.scheduled_time - datetime.utcnow())
        })
    
    return {"queue": queue, "total": len(queue)}

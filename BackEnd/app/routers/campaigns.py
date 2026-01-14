from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models import User, Campaign, CampaignPost, ScheduledPost
from app.schemas import CampaignCreate, CampaignUpdate, CampaignResponse, ScheduledPostResponse
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[CampaignResponse])
def get_campaigns(
    status: Optional[str] = Query(None, description="Filter by status: active, paused, completed"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all campaigns"""
    query = db.query(Campaign).filter(Campaign.user_id == current_user.id)
    
    if status:
        query = query.filter(Campaign.status == status)
    
    campaigns = query.order_by(Campaign.created_at.desc()).all()
    return campaigns


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific campaign"""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    return campaign


@router.post("/", response_model=CampaignResponse)
def create_campaign(
    campaign_data: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new campaign"""
    campaign = Campaign(
        user_id=current_user.id,
        name=campaign_data.name,
        description=campaign_data.description,
        start_date=campaign_data.start_date,
        end_date=campaign_data.end_date
    )
    
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    return campaign


@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: int,
    campaign_data: CampaignUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a campaign"""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    if campaign_data.name is not None:
        campaign.name = campaign_data.name
    if campaign_data.description is not None:
        campaign.description = campaign_data.description
    if campaign_data.start_date is not None:
        campaign.start_date = campaign_data.start_date
    if campaign_data.end_date is not None:
        campaign.end_date = campaign_data.end_date
    if campaign_data.status is not None:
        campaign.status = campaign_data.status
    
    db.commit()
    db.refresh(campaign)
    
    return campaign


@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a campaign"""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    db.delete(campaign)
    db.commit()
    
    return {"message": "Campaign deleted successfully"}


@router.get("/{campaign_id}/posts", response_model=List[ScheduledPostResponse])
def get_campaign_posts(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all posts in a campaign"""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    posts = db.query(ScheduledPost).join(
        CampaignPost,
        ScheduledPost.id == CampaignPost.scheduled_post_id
    ).filter(
        CampaignPost.campaign_id == campaign_id
    ).all()
    
    return posts


@router.post("/{campaign_id}/posts/{post_id}")
def add_post_to_campaign(
    campaign_id: int,
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a post to a campaign"""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    post = db.query(ScheduledPost).filter(
        ScheduledPost.id == post_id,
        ScheduledPost.user_id == current_user.id
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if already in campaign
    existing = db.query(CampaignPost).filter(
        CampaignPost.campaign_id == campaign_id,
        CampaignPost.scheduled_post_id == post_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Post already in campaign"
        )
    
    campaign_post = CampaignPost(
        campaign_id=campaign_id,
        scheduled_post_id=post_id
    )
    
    db.add(campaign_post)
    db.commit()
    
    return {"message": "Post added to campaign"}


@router.delete("/{campaign_id}/posts/{post_id}")
def remove_post_from_campaign(
    campaign_id: int,
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a post from a campaign"""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    campaign_post = db.query(CampaignPost).filter(
        CampaignPost.campaign_id == campaign_id,
        CampaignPost.scheduled_post_id == post_id
    ).first()
    
    if not campaign_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not in campaign"
        )
    
    db.delete(campaign_post)
    db.commit()
    
    return {"message": "Post removed from campaign"}


@router.get("/{campaign_id}/summary")
def get_campaign_summary(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get campaign summary with post counts and status"""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    posts = db.query(ScheduledPost).join(
        CampaignPost,
        ScheduledPost.id == CampaignPost.scheduled_post_id
    ).filter(
        CampaignPost.campaign_id == campaign_id
    ).all()
    
    # Count by status
    status_counts = {
        "draft": 0,
        "scheduled": 0,
        "published": 0,
        "failed": 0
    }
    
    # Count by platform
    platform_counts = {}
    
    for post in posts:
        status_counts[post.status] = status_counts.get(post.status, 0) + 1
        platform_counts[post.platform] = platform_counts.get(post.platform, 0) + 1
    
    return {
        "campaign": {
            "id": campaign.id,
            "name": campaign.name,
            "status": campaign.status,
            "start_date": campaign.start_date,
            "end_date": campaign.end_date
        },
        "total_posts": len(posts),
        "by_status": status_counts,
        "by_platform": platform_counts
    }


@router.put("/{campaign_id}/status")
def update_campaign_status(
    campaign_id: int,
    new_status: str = Query(..., description="New status: active, paused, completed"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update campaign status"""
    if new_status not in ["active", "paused", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Use: active, paused, completed"
        )
    
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    campaign.status = new_status
    db.commit()
    
    return {"message": f"Campaign status updated to {new_status}"}

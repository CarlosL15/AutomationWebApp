from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.database import get_db
from app.models import (
    User, AnalyticsSnapshot, PostAnalytics, ScheduledPost,
    Campaign, CampaignPost
)
from app.schemas import AnalyticsSnapshotResponse, PostAnalyticsResponse, AnalyticsSummary
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/overview")
def get_analytics_overview(
    days: int = Query(30, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analytics overview across all platforms"""
    start_date = date.today() - timedelta(days=days)
    
    # Get latest snapshots for each platform
    platforms = ["tiktok", "instagram", "youtube", "facebook"]
    overview = {}
    
    for platform in platforms:
        latest = db.query(AnalyticsSnapshot).filter(
            AnalyticsSnapshot.user_id == current_user.id,
            AnalyticsSnapshot.platform == platform
        ).order_by(AnalyticsSnapshot.snapshot_date.desc()).first()
        
        previous = db.query(AnalyticsSnapshot).filter(
            AnalyticsSnapshot.user_id == current_user.id,
            AnalyticsSnapshot.platform == platform,
            AnalyticsSnapshot.snapshot_date <= start_date
        ).order_by(AnalyticsSnapshot.snapshot_date.desc()).first()
        
        if latest:
            growth = 0
            if previous and previous.followers_count > 0:
                growth = ((latest.followers_count - previous.followers_count) / 
                         previous.followers_count * 100)
            
            overview[platform] = {
                "followers": latest.followers_count,
                "follower_growth": round(growth, 2),
                "engagement_rate": float(latest.engagement_rate) if latest.engagement_rate else 0,
                "impressions": latest.impressions,
                "reach": latest.reach
            }
    
    # Total metrics
    total_followers = sum(p.get("followers", 0) for p in overview.values())
    avg_engagement = sum(p.get("engagement_rate", 0) for p in overview.values()) / len(overview) if overview else 0
    total_impressions = sum(p.get("impressions", 0) for p in overview.values())
    
    return {
        "period_days": days,
        "platforms": overview,
        "totals": {
            "total_followers": total_followers,
            "average_engagement_rate": round(avg_engagement, 2),
            "total_impressions": total_impressions
        }
    }


@router.get("/platform/{platform}")
def get_platform_analytics(
    platform: str,
    days: int = Query(30, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed analytics for a specific platform"""
    start_date = date.today() - timedelta(days=days)
    
    snapshots = db.query(AnalyticsSnapshot).filter(
        AnalyticsSnapshot.user_id == current_user.id,
        AnalyticsSnapshot.platform == platform,
        AnalyticsSnapshot.snapshot_date >= start_date
    ).order_by(AnalyticsSnapshot.snapshot_date.asc()).all()
    
    if not snapshots:
        return {
            "platform": platform,
            "data": [],
            "summary": None
        }
    
    # Build time series data
    data = []
    for snapshot in snapshots:
        data.append({
            "date": snapshot.snapshot_date.isoformat(),
            "followers": snapshot.followers_count,
            "engagement_rate": float(snapshot.engagement_rate) if snapshot.engagement_rate else 0,
            "impressions": snapshot.impressions,
            "reach": snapshot.reach,
            "likes": snapshot.likes,
            "comments": snapshot.comments,
            "shares": snapshot.shares
        })
    
    # Calculate summary
    latest = snapshots[-1]
    earliest = snapshots[0]
    
    follower_growth = latest.followers_count - earliest.followers_count
    growth_rate = (follower_growth / earliest.followers_count * 100) if earliest.followers_count > 0 else 0
    
    total_engagement = sum(s.likes + s.comments + s.shares for s in snapshots)
    avg_engagement = sum(float(s.engagement_rate or 0) for s in snapshots) / len(snapshots)
    
    return {
        "platform": platform,
        "period_days": days,
        "data": data,
        "summary": {
            "current_followers": latest.followers_count,
            "follower_growth": follower_growth,
            "growth_rate": round(growth_rate, 2),
            "total_engagement": total_engagement,
            "average_engagement_rate": round(avg_engagement, 2),
            "total_impressions": sum(s.impressions for s in snapshots),
            "total_reach": sum(s.reach for s in snapshots)
        }
    }


@router.get("/posts")
def get_post_analytics(
    platform: Optional[str] = None,
    days: int = Query(30, le=365),
    limit: int = Query(20, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analytics for individual posts"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(ScheduledPost, PostAnalytics).outerjoin(
        PostAnalytics,
        ScheduledPost.id == PostAnalytics.scheduled_post_id
    ).filter(
        ScheduledPost.user_id == current_user.id,
        ScheduledPost.status == "published",
        ScheduledPost.published_at >= start_date
    )
    
    if platform:
        query = query.filter(ScheduledPost.platform == platform)
    
    results = query.order_by(ScheduledPost.published_at.desc()).limit(limit).all()
    
    posts = []
    for post, analytics in results:
        post_data = {
            "id": post.id,
            "platform": post.platform,
            "content": post.content[:100] + "..." if len(post.content) > 100 else post.content,
            "published_at": post.published_at,
            "analytics": None
        }
        
        if analytics:
            post_data["analytics"] = {
                "impressions": analytics.impressions,
                "reach": analytics.reach,
                "likes": analytics.likes,
                "comments": analytics.comments,
                "shares": analytics.shares,
                "saves": analytics.saves,
                "clicks": analytics.clicks,
                "engagement_rate": float(analytics.engagement_rate) if analytics.engagement_rate else 0
            }
        
        posts.append(post_data)
    
    return {"posts": posts}


@router.get("/posts/{post_id}")
def get_single_post_analytics(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed analytics for a single post"""
    post = db.query(ScheduledPost).filter(
        ScheduledPost.id == post_id,
        ScheduledPost.user_id == current_user.id
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    analytics = db.query(PostAnalytics).filter(
        PostAnalytics.scheduled_post_id == post_id
    ).first()
    
    return {
        "post": {
            "id": post.id,
            "platform": post.platform,
            "content": post.content,
            "published_at": post.published_at,
            "status": post.status
        },
        "analytics": {
            "impressions": analytics.impressions if analytics else 0,
            "reach": analytics.reach if analytics else 0,
            "likes": analytics.likes if analytics else 0,
            "comments": analytics.comments if analytics else 0,
            "shares": analytics.shares if analytics else 0,
            "saves": analytics.saves if analytics else 0,
            "clicks": analytics.clicks if analytics else 0,
            "engagement_rate": float(analytics.engagement_rate) if analytics and analytics.engagement_rate else 0
        } if analytics else None
    }


@router.get("/campaigns/{campaign_id}")
def get_campaign_analytics(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analytics for a campaign"""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    # Get all posts in campaign with analytics
    campaign_posts = db.query(ScheduledPost, PostAnalytics).join(
        CampaignPost,
        ScheduledPost.id == CampaignPost.scheduled_post_id
    ).outerjoin(
        PostAnalytics,
        ScheduledPost.id == PostAnalytics.scheduled_post_id
    ).filter(
        CampaignPost.campaign_id == campaign_id
    ).all()
    
    # Aggregate analytics
    total_impressions = 0
    total_reach = 0
    total_likes = 0
    total_comments = 0
    total_shares = 0
    total_clicks = 0
    posts_with_analytics = 0
    
    posts_data = []
    for post, analytics in campaign_posts:
        post_info = {
            "id": post.id,
            "platform": post.platform,
            "content": post.content[:50] + "..." if len(post.content) > 50 else post.content,
            "status": post.status,
            "published_at": post.published_at
        }
        
        if analytics:
            posts_with_analytics += 1
            total_impressions += analytics.impressions
            total_reach += analytics.reach
            total_likes += analytics.likes
            total_comments += analytics.comments
            total_shares += analytics.shares
            total_clicks += analytics.clicks
            
            post_info["engagement"] = analytics.likes + analytics.comments + analytics.shares
        
        posts_data.append(post_info)
    
    total_posts = len(campaign_posts)
    published_posts = sum(1 for p, _ in campaign_posts if p.status == "published")
    
    engagement_rate = 0
    if total_impressions > 0:
        engagement_rate = ((total_likes + total_comments + total_shares) / total_impressions) * 100
    
    return {
        "campaign": {
            "id": campaign.id,
            "name": campaign.name,
            "start_date": campaign.start_date,
            "end_date": campaign.end_date,
            "status": campaign.status
        },
        "summary": {
            "total_posts": total_posts,
            "published_posts": published_posts,
            "total_impressions": total_impressions,
            "total_reach": total_reach,
            "total_engagement": total_likes + total_comments + total_shares,
            "engagement_rate": round(engagement_rate, 2),
            "total_clicks": total_clicks
        },
        "posts": posts_data
    }


@router.get("/top-posts")
def get_top_posts(
    platform: Optional[str] = None,
    metric: str = Query("engagement", description="Sort by: engagement, impressions, reach, likes, comments, shares"),
    days: int = Query(30, le=365),
    limit: int = Query(10, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top performing posts"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(ScheduledPost, PostAnalytics).join(
        PostAnalytics,
        ScheduledPost.id == PostAnalytics.scheduled_post_id
    ).filter(
        ScheduledPost.user_id == current_user.id,
        ScheduledPost.status == "published",
        ScheduledPost.published_at >= start_date
    )
    
    if platform:
        query = query.filter(ScheduledPost.platform == platform)
    
    # Sort by metric
    sort_column = {
        "engagement": PostAnalytics.likes + PostAnalytics.comments + PostAnalytics.shares,
        "impressions": PostAnalytics.impressions,
        "reach": PostAnalytics.reach,
        "likes": PostAnalytics.likes,
        "comments": PostAnalytics.comments,
        "shares": PostAnalytics.shares
    }.get(metric, PostAnalytics.likes + PostAnalytics.comments + PostAnalytics.shares)
    
    results = query.order_by(sort_column.desc()).limit(limit).all()
    
    top_posts = []
    for post, analytics in results:
        top_posts.append({
            "id": post.id,
            "platform": post.platform,
            "content": post.content[:100] + "..." if len(post.content) > 100 else post.content,
            "published_at": post.published_at,
            "impressions": analytics.impressions,
            "reach": analytics.reach,
            "engagement": analytics.likes + analytics.comments + analytics.shares,
            "likes": analytics.likes,
            "comments": analytics.comments,
            "shares": analytics.shares
        })
    
    return {"top_posts": top_posts, "sorted_by": metric}


@router.get("/report")
def generate_report(
    start_date: date,
    end_date: date,
    platforms: Optional[List[str]] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a comprehensive analytics report"""
    if not platforms:
        platforms = ["tiktok", "instagram", "youtube", "facebook"]
    
    report = {
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "generated_at": datetime.utcnow().isoformat(),
        "platforms": {}
    }
    
    for platform in platforms:
        snapshots = db.query(AnalyticsSnapshot).filter(
            AnalyticsSnapshot.user_id == current_user.id,
            AnalyticsSnapshot.platform == platform,
            AnalyticsSnapshot.snapshot_date >= start_date,
            AnalyticsSnapshot.snapshot_date <= end_date
        ).order_by(AnalyticsSnapshot.snapshot_date.asc()).all()
        
        if not snapshots:
            continue
        
        first = snapshots[0]
        last = snapshots[-1]
        
        report["platforms"][platform] = {
            "followers": {
                "start": first.followers_count,
                "end": last.followers_count,
                "change": last.followers_count - first.followers_count
            },
            "engagement": {
                "total_likes": sum(s.likes for s in snapshots),
                "total_comments": sum(s.comments for s in snapshots),
                "total_shares": sum(s.shares for s in snapshots),
                "average_engagement_rate": round(
                    sum(float(s.engagement_rate or 0) for s in snapshots) / len(snapshots), 2
                )
            },
            "reach": {
                "total_impressions": sum(s.impressions for s in snapshots),
                "total_reach": sum(s.reach for s in snapshots)
            }
        }
    
    return report

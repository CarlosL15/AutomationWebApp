from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import ScheduledPost, PlatformConnection
from app.services.platform_api import platform_api_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def publish_scheduled_posts():
    """Check and publish posts that are due"""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # Get posts that are scheduled and due
        posts = db.query(ScheduledPost).filter(
            ScheduledPost.status == "scheduled",
            ScheduledPost.scheduled_time <= now
        ).all()
        
        for post in posts:
            try:
                # Get platform connection for the user
                connection = db.query(PlatformConnection).filter(
                    PlatformConnection.user_id == post.user_id,
                    PlatformConnection.platform == post.platform,
                    PlatformConnection.is_active == True
                ).first()
                
                if not connection:
                    post.status = "failed"
                    post.error_message = "No active platform connection found"
                    continue
                
                # Publish based on platform
                result = await publish_to_platform(
                    platform=post.platform,
                    access_token=connection.access_token,
                    content=post.content,
                    media_urls=post.media_urls,
                    platform_user_id=connection.platform_user_id
                )
                
                if result.get("success"):
                    post.status = "published"
                    post.published_at = datetime.utcnow()
                    post.external_post_id = result.get("post_id")
                else:
                    post.status = "failed"
                    post.error_message = result.get("error", "Unknown error")
                
            except Exception as e:
                logger.error(f"Error publishing post {post.id}: {str(e)}")
                post.status = "failed"
                post.error_message = str(e)
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error in scheduler: {str(e)}")
        db.rollback()
    finally:
        db.close()


async def publish_to_platform(
    platform: str,
    access_token: str,
    content: str,
    media_urls: list = None,
    platform_user_id: str = None
) -> dict:
    """Publish content to the specified platform"""
    try:
        if platform == "tiktok":
            if media_urls and len(media_urls) > 0:
                result = await platform_api_service.tiktok_publish_video(
                    access_token=access_token,
                    video_url=media_urls[0],
                    caption=content
                )
                return {"success": True, "post_id": result.get("publish_id")}
            return {"success": False, "error": "TikTok requires a video"}
        
        elif platform == "instagram":
            if media_urls and len(media_urls) > 0:
                result = await platform_api_service.instagram_publish_post(
                    access_token=access_token,
                    instagram_account_id=platform_user_id,
                    image_url=media_urls[0],
                    caption=content
                )
                return {"success": True, "post_id": result.get("id")}
            return {"success": False, "error": "Instagram requires media"}
        
        elif platform == "youtube":
            if media_urls and len(media_urls) > 0:
                result = await platform_api_service.youtube_upload_video(
                    access_token=access_token,
                    video_path=media_urls[0],
                    title=content[:100],  # YouTube title limit
                    description=content
                )
                return {"success": True, "post_id": result.get("id")}
            return {"success": False, "error": "YouTube requires a video"}
        
        elif platform == "facebook":
            result = await platform_api_service.facebook_publish_post(
                access_token=access_token,
                page_id=platform_user_id,
                message=content,
                photo_url=media_urls[0] if media_urls else None
            )
            return {"success": True, "post_id": result.get("id")}
        
        return {"success": False, "error": f"Unsupported platform: {platform}"}
    
    except Exception as e:
        return {"success": False, "error": str(e)}


async def sync_inbox_messages():
    """Sync messages from all connected platforms"""
    db = SessionLocal()
    try:
        connections = db.query(PlatformConnection).filter(
            PlatformConnection.is_active == True
        ).all()
        
        for connection in connections:
            try:
                await sync_platform_messages(db, connection)
            except Exception as e:
                logger.error(f"Error syncing messages for {connection.platform}: {str(e)}")
        
        db.commit()
    except Exception as e:
        logger.error(f"Error in inbox sync: {str(e)}")
        db.rollback()
    finally:
        db.close()


async def sync_platform_messages(db: Session, connection: PlatformConnection):
    """Sync messages from a specific platform connection"""
    from app.models import InboxMessage
    from textblob import TextBlob
    
    messages = []
    
    if connection.platform == "instagram":
        result = await platform_api_service.instagram_get_messages(
            access_token=connection.access_token,
            instagram_account_id=connection.platform_user_id
        )
        messages = result.get("data", [])
    
    elif connection.platform == "facebook":
        result = await platform_api_service.facebook_get_page_messages(
            access_token=connection.access_token,
            page_id=connection.platform_user_id
        )
        messages = result.get("data", [])
    
    elif connection.platform == "youtube":
        # YouTube comments would need video IDs
        pass
    
    # Process and store messages
    for msg in messages:
        existing = db.query(InboxMessage).filter(
            InboxMessage.external_message_id == msg.get("id")
        ).first()
        
        if not existing:
            content = msg.get("message", msg.get("snippet", ""))
            
            # Simple sentiment analysis
            sentiment = "neutral"
            if content:
                blob = TextBlob(content)
                if blob.sentiment.polarity > 0.1:
                    sentiment = "positive"
                elif blob.sentiment.polarity < -0.1:
                    sentiment = "negative"
            
            inbox_message = InboxMessage(
                user_id=connection.user_id,
                platform=connection.platform,
                message_type="dm",
                external_message_id=msg.get("id"),
                sender_username=msg.get("from", {}).get("name"),
                content=content,
                sentiment=sentiment,
                received_at=datetime.utcnow()
            )
            db.add(inbox_message)


async def update_analytics():
    """Update analytics for all connected platforms"""
    db = SessionLocal()
    try:
        from app.models import AnalyticsSnapshot
        from datetime import date
        
        connections = db.query(PlatformConnection).filter(
            PlatformConnection.is_active == True
        ).all()
        
        today = date.today()
        
        for connection in connections:
            try:
                stats = await get_platform_stats(connection)
                
                if stats:
                    # Check if snapshot exists for today
                    existing = db.query(AnalyticsSnapshot).filter(
                        AnalyticsSnapshot.user_id == connection.user_id,
                        AnalyticsSnapshot.platform == connection.platform,
                        AnalyticsSnapshot.snapshot_date == today
                    ).first()
                    
                    if existing:
                        # Update existing
                        for key, value in stats.items():
                            if hasattr(existing, key):
                                setattr(existing, key, value)
                    else:
                        # Create new snapshot
                        snapshot = AnalyticsSnapshot(
                            user_id=connection.user_id,
                            platform=connection.platform,
                            snapshot_date=today,
                            **stats
                        )
                        db.add(snapshot)
                
            except Exception as e:
                logger.error(f"Error updating analytics for {connection.platform}: {str(e)}")
        
        db.commit()
    except Exception as e:
        logger.error(f"Error in analytics update: {str(e)}")
        db.rollback()
    finally:
        db.close()


async def get_platform_stats(connection: PlatformConnection) -> dict:
    """Get statistics from a platform"""
    stats = {}
    
    if connection.platform == "instagram":
        result = await platform_api_service.instagram_get_insights(
            access_token=connection.access_token,
            instagram_account_id=connection.platform_user_id
        )
        data = result.get("data", [])
        for metric in data:
            name = metric.get("name")
            value = metric.get("values", [{}])[0].get("value", 0)
            if name == "impressions":
                stats["impressions"] = value
            elif name == "reach":
                stats["reach"] = value
            elif name == "follower_count":
                stats["followers_count"] = value
            elif name == "profile_views":
                stats["profile_views"] = value
    
    elif connection.platform == "youtube":
        result = await platform_api_service.youtube_get_channel_stats(
            access_token=connection.access_token
        )
        items = result.get("items", [])
        if items:
            statistics = items[0].get("statistics", {})
            stats["followers_count"] = int(statistics.get("subscriberCount", 0))
            stats["posts_count"] = int(statistics.get("videoCount", 0))
            stats["impressions"] = int(statistics.get("viewCount", 0))
    
    elif connection.platform == "facebook":
        result = await platform_api_service.facebook_get_page_insights(
            access_token=connection.access_token,
            page_id=connection.platform_user_id
        )
        data = result.get("data", [])
        for metric in data:
            name = metric.get("name")
            value = metric.get("values", [{}])[0].get("value", 0)
            if name == "page_impressions":
                stats["impressions"] = value
            elif name == "page_engaged_users":
                stats["likes"] = value
            elif name == "page_fans":
                stats["followers_count"] = value
            elif name == "page_views_total":
                stats["profile_views"] = value
    
    return stats


def start_scheduler():
    """Start the background scheduler"""
    # Check for scheduled posts every minute
    scheduler.add_job(
        publish_scheduled_posts,
        IntervalTrigger(minutes=1),
        id="publish_posts",
        replace_existing=True
    )
    
    # Sync inbox every 5 minutes
    scheduler.add_job(
        sync_inbox_messages,
        IntervalTrigger(minutes=5),
        id="sync_inbox",
        replace_existing=True
    )
    
    # Update analytics every hour
    scheduler.add_job(
        update_analytics,
        IntervalTrigger(hours=1),
        id="update_analytics",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started")


def shutdown_scheduler():
    """Shutdown the background scheduler"""
    scheduler.shutdown()
    logger.info("Scheduler shutdown")

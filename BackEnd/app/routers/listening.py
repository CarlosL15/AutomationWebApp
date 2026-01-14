from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from textblob import TextBlob

from app.database import get_db
from app.models import User, ListeningTopic, ListeningResult, PlatformConnection
from app.schemas import ListeningTopicCreate, ListeningTopicResponse, ListeningResultResponse
from app.routers.auth import get_current_user
from app.services.platform_api import platform_api_service

router = APIRouter()


@router.get("/topics", response_model=List[ListeningTopicResponse])
def get_topics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all listening topics"""
    topics = db.query(ListeningTopic).filter(
        ListeningTopic.user_id == current_user.id
    ).order_by(ListeningTopic.created_at.desc()).all()
    
    return topics


@router.post("/topics", response_model=ListeningTopicResponse)
def create_topic(
    topic_data: ListeningTopicCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new listening topic"""
    # Check for duplicate
    existing = db.query(ListeningTopic).filter(
        ListeningTopic.user_id == current_user.id,
        ListeningTopic.keyword == topic_data.keyword
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Topic already exists"
        )
    
    topic = ListeningTopic(
        user_id=current_user.id,
        keyword=topic_data.keyword,
        platforms=topic_data.platforms
    )
    
    db.add(topic)
    db.commit()
    db.refresh(topic)
    
    return topic


@router.delete("/topics/{topic_id}")
def delete_topic(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a listening topic"""
    topic = db.query(ListeningTopic).filter(
        ListeningTopic.id == topic_id,
        ListeningTopic.user_id == current_user.id
    ).first()
    
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found"
        )
    
    db.delete(topic)
    db.commit()
    
    return {"message": "Topic deleted successfully"}


@router.put("/topics/{topic_id}/toggle")
def toggle_topic(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle topic active status"""
    topic = db.query(ListeningTopic).filter(
        ListeningTopic.id == topic_id,
        ListeningTopic.user_id == current_user.id
    ).first()
    
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found"
        )
    
    topic.is_active = not topic.is_active
    db.commit()
    
    return {"message": f"Topic {'activated' if topic.is_active else 'deactivated'}"}


@router.get("/topics/{topic_id}/results", response_model=List[ListeningResultResponse])
def get_topic_results(
    topic_id: int,
    platform: Optional[str] = None,
    sentiment: Optional[str] = None,
    days: int = Query(7, le=30),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get results for a listening topic"""
    topic = db.query(ListeningTopic).filter(
        ListeningTopic.id == topic_id,
        ListeningTopic.user_id == current_user.id
    ).first()
    
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found"
        )
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(ListeningResult).filter(
        ListeningResult.topic_id == topic_id,
        ListeningResult.discovered_at >= start_date
    )
    
    if platform:
        query = query.filter(ListeningResult.platform == platform)
    if sentiment:
        query = query.filter(ListeningResult.sentiment == sentiment)
    
    results = query.order_by(
        ListeningResult.engagement_score.desc()
    ).limit(limit).all()
    
    return results


@router.post("/topics/{topic_id}/search")
async def search_topic(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger a search for a topic"""
    topic = db.query(ListeningTopic).filter(
        ListeningTopic.id == topic_id,
        ListeningTopic.user_id == current_user.id
    ).first()
    
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found"
        )
    
    results_added = 0
    
    for platform in topic.platforms or []:
        # Get connection for platform
        connection = db.query(PlatformConnection).filter(
            PlatformConnection.user_id == current_user.id,
            PlatformConnection.platform == platform,
            PlatformConnection.is_active == True
        ).first()
        
        if not connection:
            continue
        
        try:
            # Search platform
            search_results = await platform_api_service.search_platform(
                platform=platform,
                access_token=connection.access_token,
                query=topic.keyword
            )
            
            # Process results
            items = search_results.get("items", search_results.get("data", []))
            
            for item in items:
                # Check if already exists
                external_id = item.get("id", {})
                if isinstance(external_id, dict):
                    external_id = external_id.get("videoId", str(external_id))
                
                existing = db.query(ListeningResult).filter(
                    ListeningResult.topic_id == topic_id,
                    ListeningResult.platform == platform,
                    ListeningResult.external_post_id == str(external_id)
                ).first()
                
                if existing:
                    continue
                
                # Extract content
                content = ""
                if "snippet" in item:
                    content = item["snippet"].get("title", "") + " " + item["snippet"].get("description", "")
                elif "message" in item:
                    content = item["message"]
                
                # Analyze sentiment
                sentiment = "neutral"
                if content:
                    blob = TextBlob(content)
                    if blob.sentiment.polarity > 0.1:
                        sentiment = "positive"
                    elif blob.sentiment.polarity < -0.1:
                        sentiment = "negative"
                
                # Create result
                result = ListeningResult(
                    topic_id=topic_id,
                    platform=platform,
                    external_post_id=str(external_id),
                    author_username=item.get("snippet", {}).get("channelTitle", 
                                    item.get("from", {}).get("name")),
                    content=content[:1000] if content else None,
                    sentiment=sentiment,
                    engagement_score=0
                )
                
                db.add(result)
                results_added += 1
        
        except Exception as e:
            print(f"Error searching {platform}: {e}")
            continue
    
    db.commit()
    
    return {"message": f"Search completed. Added {results_added} new results."}


@router.get("/trends")
def get_trends(
    days: int = Query(7, le=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trending topics and sentiment analysis"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all topics for user
    topics = db.query(ListeningTopic).filter(
        ListeningTopic.user_id == current_user.id,
        ListeningTopic.is_active == True
    ).all()
    
    trends = []
    
    for topic in topics:
        # Get results for topic
        results = db.query(ListeningResult).filter(
            ListeningResult.topic_id == topic.id,
            ListeningResult.discovered_at >= start_date
        ).all()
        
        if not results:
            continue
        
        # Analyze sentiment distribution
        sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
        total_engagement = 0
        
        for result in results:
            if result.sentiment:
                sentiment_counts[result.sentiment] = sentiment_counts.get(result.sentiment, 0) + 1
            total_engagement += result.engagement_score
        
        total_results = len(results)
        
        trends.append({
            "keyword": topic.keyword,
            "total_mentions": total_results,
            "total_engagement": total_engagement,
            "sentiment_breakdown": {
                "positive": round(sentiment_counts["positive"] / total_results * 100, 1),
                "negative": round(sentiment_counts["negative"] / total_results * 100, 1),
                "neutral": round(sentiment_counts["neutral"] / total_results * 100, 1)
            },
            "overall_sentiment": max(sentiment_counts, key=sentiment_counts.get)
        })
    
    # Sort by mentions
    trends.sort(key=lambda x: x["total_mentions"], reverse=True)
    
    return {"period_days": days, "trends": trends}


@router.get("/sentiment-over-time/{topic_id}")
def get_sentiment_over_time(
    topic_id: int,
    days: int = Query(14, le=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sentiment trend over time for a topic"""
    topic = db.query(ListeningTopic).filter(
        ListeningTopic.id == topic_id,
        ListeningTopic.user_id == current_user.id
    ).first()
    
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found"
        )
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get daily sentiment counts
    daily_data = []
    
    for i in range(days):
        day_start = start_date + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        
        day_results = db.query(ListeningResult).filter(
            ListeningResult.topic_id == topic_id,
            ListeningResult.discovered_at >= day_start,
            ListeningResult.discovered_at < day_end
        ).all()
        
        sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
        for result in day_results:
            if result.sentiment:
                sentiment_counts[result.sentiment] += 1
        
        daily_data.append({
            "date": day_start.date().isoformat(),
            "total": len(day_results),
            "positive": sentiment_counts["positive"],
            "negative": sentiment_counts["negative"],
            "neutral": sentiment_counts["neutral"]
        })
    
    return {
        "topic": topic.keyword,
        "period_days": days,
        "data": daily_data
    }


@router.get("/competitors")
def analyze_competitors(
    competitor_keywords: List[str] = Query(..., description="Keywords to track for competitors"),
    days: int = Query(7, le=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze competitor mentions (requires topics to be set up)"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    analysis = []
    
    for keyword in competitor_keywords:
        # Find topic if exists
        topic = db.query(ListeningTopic).filter(
            ListeningTopic.user_id == current_user.id,
            ListeningTopic.keyword.ilike(f"%{keyword}%")
        ).first()
        
        if not topic:
            analysis.append({
                "keyword": keyword,
                "status": "not_tracked",
                "message": "Create a listening topic for this keyword"
            })
            continue
        
        results = db.query(ListeningResult).filter(
            ListeningResult.topic_id == topic.id,
            ListeningResult.discovered_at >= start_date
        ).all()
        
        if not results:
            analysis.append({
                "keyword": keyword,
                "mentions": 0,
                "sentiment": None
            })
            continue
        
        sentiment_sum = 0
        for result in results:
            if result.sentiment == "positive":
                sentiment_sum += 1
            elif result.sentiment == "negative":
                sentiment_sum -= 1
        
        avg_sentiment = sentiment_sum / len(results)
        
        analysis.append({
            "keyword": keyword,
            "mentions": len(results),
            "average_sentiment": round(avg_sentiment, 2),
            "sentiment_label": "positive" if avg_sentiment > 0.1 else "negative" if avg_sentiment < -0.1 else "neutral",
            "top_engagement": max(r.engagement_score for r in results) if results else 0
        })
    
    return {"period_days": days, "competitors": analysis}

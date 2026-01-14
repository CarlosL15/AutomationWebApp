from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import OptimalTime, ScheduledPost, PostAnalytics
from decimal import Decimal


class OptimalTimeService:
    """Service for calculating AI-powered optimal posting times"""
    
    # Default optimal times based on general social media research
    DEFAULT_OPTIMAL_HOURS = {
        "tiktok": [7, 9, 12, 15, 19, 21],  # Early morning, lunch, evening
        "instagram": [8, 11, 14, 17, 20],   # Mid-morning, lunch, evening
        "youtube": [12, 15, 17, 21],        # Afternoon and evening
        "facebook": [9, 13, 16, 19]         # Business hours and evening
    }
    
    # Best days for each platform (0=Sunday, 6=Saturday)
    DEFAULT_OPTIMAL_DAYS = {
        "tiktok": [1, 2, 3, 4],      # Weekdays
        "instagram": [1, 2, 3],      # Monday-Wednesday
        "youtube": [4, 5, 6, 0],     # Thursday-Sunday
        "facebook": [2, 3, 4]        # Tuesday-Thursday
    }
    
    def calculate_engagement_score(
        self,
        likes: int,
        comments: int,
        shares: int,
        saves: int,
        impressions: int
    ) -> float:
        """Calculate engagement score from metrics"""
        if impressions == 0:
            return 0.0
        
        # Weighted engagement calculation
        engagement = (
            likes * 1.0 +
            comments * 2.0 +  # Comments weighted higher
            shares * 3.0 +    # Shares weighted highest
            saves * 2.5       # Saves also valuable
        )
        
        return (engagement / impressions) * 100
    
    def update_optimal_times(self, db: Session, user_id: int) -> None:
        """Update optimal times based on user's historical post performance"""
        
        # Get published posts with analytics
        posts = db.query(ScheduledPost, PostAnalytics).join(
            PostAnalytics,
            ScheduledPost.id == PostAnalytics.scheduled_post_id
        ).filter(
            ScheduledPost.user_id == user_id,
            ScheduledPost.status == "published"
        ).all()
        
        # Group by platform, day, and hour
        time_performance = {}
        
        for post, analytics in posts:
            if not post.published_at:
                continue
            
            platform = post.platform
            day_of_week = post.published_at.weekday()
            hour_of_day = post.published_at.hour
            
            key = (platform, day_of_week, hour_of_day)
            
            engagement = self.calculate_engagement_score(
                likes=analytics.likes or 0,
                comments=analytics.comments or 0,
                shares=analytics.shares or 0,
                saves=analytics.saves or 0,
                impressions=analytics.impressions or 1
            )
            
            if key not in time_performance:
                time_performance[key] = {"total": 0, "count": 0}
            
            time_performance[key]["total"] += engagement
            time_performance[key]["count"] += 1
        
        # Update optimal times in database
        for (platform, day, hour), data in time_performance.items():
            avg_engagement = data["total"] / data["count"] if data["count"] > 0 else 0
            
            existing = db.query(OptimalTime).filter(
                OptimalTime.user_id == user_id,
                OptimalTime.platform == platform,
                OptimalTime.day_of_week == day,
                OptimalTime.hour_of_day == hour
            ).first()
            
            if existing:
                existing.engagement_score = Decimal(str(avg_engagement))
                existing.sample_size = data["count"]
            else:
                optimal_time = OptimalTime(
                    user_id=user_id,
                    platform=platform,
                    day_of_week=day,
                    hour_of_day=hour,
                    engagement_score=Decimal(str(avg_engagement)),
                    sample_size=data["count"]
                )
                db.add(optimal_time)
        
        db.commit()
    
    def get_optimal_times(
        self,
        db: Session,
        user_id: int,
        platform: str,
        count: int = 5
    ) -> List[Dict]:
        """Get the best times to post for a user on a platform"""
        
        # Get user's learned optimal times
        optimal_times = db.query(OptimalTime).filter(
            OptimalTime.user_id == user_id,
            OptimalTime.platform == platform
        ).order_by(
            OptimalTime.engagement_score.desc()
        ).limit(count).all()
        
        if optimal_times and len(optimal_times) >= 3:
            # Use learned data if we have enough samples
            return [
                {
                    "day_of_week": ot.day_of_week,
                    "hour_of_day": ot.hour_of_day,
                    "engagement_score": float(ot.engagement_score),
                    "sample_size": ot.sample_size,
                    "day_name": self._day_name(ot.day_of_week),
                    "time_formatted": f"{ot.hour_of_day:02d}:00"
                }
                for ot in optimal_times
            ]
        
        # Fall back to default times
        return self._get_default_optimal_times(platform, count)
    
    def _get_default_optimal_times(self, platform: str, count: int) -> List[Dict]:
        """Get default optimal times for a platform"""
        hours = self.DEFAULT_OPTIMAL_HOURS.get(platform, [9, 12, 17, 20])
        days = self.DEFAULT_OPTIMAL_DAYS.get(platform, [1, 2, 3, 4, 5])
        
        results = []
        for day in days:
            for hour in hours:
                results.append({
                    "day_of_week": day,
                    "hour_of_day": hour,
                    "engagement_score": 0.0,
                    "sample_size": 0,
                    "day_name": self._day_name(day),
                    "time_formatted": f"{hour:02d}:00",
                    "is_default": True
                })
        
        return results[:count]
    
    def suggest_optimal_time(
        self,
        db: Session,
        user_id: int,
        platform: str,
        preferred_date: Optional[datetime] = None
    ) -> datetime:
        """Suggest the next optimal posting time"""
        
        optimal_times = self.get_optimal_times(db, user_id, platform, count=10)
        
        now = datetime.utcnow()
        base_date = preferred_date or now
        
        # Find the next available optimal time slot
        for days_ahead in range(7):
            check_date = base_date + timedelta(days=days_ahead)
            day_of_week = check_date.weekday()
            
            # Find optimal times for this day
            day_times = [
                ot for ot in optimal_times
                if ot["day_of_week"] == day_of_week
            ]
            
            for ot in sorted(day_times, key=lambda x: -x.get("engagement_score", 0)):
                suggested_time = check_date.replace(
                    hour=ot["hour_of_day"],
                    minute=0,
                    second=0,
                    microsecond=0
                )
                
                # Make sure it's in the future
                if suggested_time > now:
                    return suggested_time
        
        # Fallback: next day at default time
        return now + timedelta(days=1)
    
    def _day_name(self, day_of_week: int) -> str:
        """Convert day number to name"""
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return days[day_of_week % 7]
    
    def get_posting_heatmap(
        self,
        db: Session,
        user_id: int,
        platform: str
    ) -> List[List[float]]:
        """Get a 7x24 heatmap of optimal posting times"""
        
        # Initialize 7 days x 24 hours matrix
        heatmap = [[0.0 for _ in range(24)] for _ in range(7)]
        
        optimal_times = db.query(OptimalTime).filter(
            OptimalTime.user_id == user_id,
            OptimalTime.platform == platform
        ).all()
        
        if optimal_times:
            for ot in optimal_times:
                heatmap[ot.day_of_week][ot.hour_of_day] = float(ot.engagement_score)
        else:
            # Use default values
            hours = self.DEFAULT_OPTIMAL_HOURS.get(platform, [])
            days = self.DEFAULT_OPTIMAL_DAYS.get(platform, [])
            
            for day in days:
                for hour in hours:
                    heatmap[day][hour] = 50.0  # Default score
        
        return heatmap


optimal_time_service = OptimalTimeService()

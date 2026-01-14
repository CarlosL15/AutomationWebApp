from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# Platform connection schemas
class PlatformConnectionCreate(BaseModel):
    platform: str
    access_token: str
    refresh_token: Optional[str] = None
    platform_user_id: Optional[str] = None
    platform_username: Optional[str] = None


class PlatformConnectionResponse(BaseModel):
    id: int
    platform: str
    platform_username: Optional[str]
    is_active: bool
    connected_at: datetime

    class Config:
        from_attributes = True


# Scheduled post schemas
class ScheduledPostCreate(BaseModel):
    platform: str
    content: str
    media_urls: Optional[List[str]] = None
    scheduled_time: datetime
    use_optimal_time: bool = False


class ScheduledPostUpdate(BaseModel):
    content: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    status: Optional[str] = None


class ScheduledPostResponse(BaseModel):
    id: int
    platform: str
    content: str
    media_urls: Optional[List[str]]
    scheduled_time: datetime
    optimal_time_suggested: Optional[datetime]
    status: str
    published_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# Inbox schemas
class InboxMessageResponse(BaseModel):
    id: int
    platform: str
    message_type: str
    sender_username: Optional[str]
    sender_avatar_url: Optional[str]
    content: Optional[str]
    is_read: bool
    is_replied: bool
    sentiment: Optional[str]
    received_at: Optional[datetime]

    class Config:
        from_attributes = True


class InboxReplyCreate(BaseModel):
    content: str


class InboxReplyResponse(BaseModel):
    id: int
    content: str
    sent_at: datetime
    status: str

    class Config:
        from_attributes = True


# Analytics schemas
class AnalyticsSnapshotResponse(BaseModel):
    id: int
    platform: str
    snapshot_date: date
    followers_count: int
    following_count: int
    posts_count: int
    engagement_rate: Optional[Decimal]
    impressions: int
    reach: int
    likes: int
    comments: int
    shares: int
    saves: int
    profile_views: int

    class Config:
        from_attributes = True


class PostAnalyticsResponse(BaseModel):
    id: int
    impressions: int
    reach: int
    likes: int
    comments: int
    shares: int
    saves: int
    clicks: int
    engagement_rate: Optional[Decimal]

    class Config:
        from_attributes = True


class AnalyticsSummary(BaseModel):
    platform: str
    total_followers: int
    follower_growth: int
    total_engagement: int
    engagement_rate: float
    top_performing_posts: List[dict]


# Campaign schemas
class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None


class CampaignResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# Listening schemas
class ListeningTopicCreate(BaseModel):
    keyword: str
    platforms: Optional[List[str]] = ["tiktok", "instagram", "youtube", "facebook"]


class ListeningTopicResponse(BaseModel):
    id: int
    keyword: str
    platforms: Optional[List[str]]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ListeningResultResponse(BaseModel):
    id: int
    platform: str
    author_username: Optional[str]
    content: Optional[str]
    post_url: Optional[str]
    sentiment: Optional[str]
    engagement_score: int
    discovered_at: datetime

    class Config:
        from_attributes = True


# Optimal time schemas
class OptimalTimeResponse(BaseModel):
    platform: str
    day_of_week: int
    hour_of_day: int
    engagement_score: Decimal

    class Config:
        from_attributes = True


class OptimalTimeSuggestion(BaseModel):
    platform: str
    suggested_times: List[dict]

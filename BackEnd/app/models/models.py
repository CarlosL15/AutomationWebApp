from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, ForeignKey, DECIMAL, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    platform_connections = relationship("PlatformConnection", back_populates="user")
    scheduled_posts = relationship("ScheduledPost", back_populates="user")
    inbox_messages = relationship("InboxMessage", back_populates="user")
    campaigns = relationship("Campaign", back_populates="user")
    listening_topics = relationship("ListeningTopic", back_populates="user")


class PlatformConnection(Base):
    __tablename__ = "platform_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    platform = Column(String(50), nullable=False)
    access_token = Column(Text)
    refresh_token = Column(Text)
    platform_user_id = Column(String(255))
    platform_username = Column(String(255))
    connected_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    user = relationship("User", back_populates="platform_connections")


class ScheduledPost(Base):
    __tablename__ = "scheduled_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    platform = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    media_urls = Column(ARRAY(Text))
    scheduled_time = Column(DateTime, nullable=False)
    optimal_time_suggested = Column(DateTime)
    status = Column(String(50), default="scheduled")
    published_at = Column(DateTime)
    external_post_id = Column(String(255))
    error_message = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="scheduled_posts")
    analytics = relationship("PostAnalytics", back_populates="post", uselist=False)
    campaign_posts = relationship("CampaignPost", back_populates="post")


class InboxMessage(Base):
    __tablename__ = "inbox_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    platform = Column(String(50), nullable=False)
    message_type = Column(String(50), nullable=False)
    external_message_id = Column(String(255))
    sender_id = Column(String(255))
    sender_username = Column(String(255))
    sender_avatar_url = Column(Text)
    content = Column(Text)
    post_id = Column(String(255))
    parent_message_id = Column(Integer, ForeignKey("inbox_messages.id"))
    is_read = Column(Boolean, default=False)
    is_replied = Column(Boolean, default=False)
    sentiment = Column(String(50))
    received_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="inbox_messages")
    replies = relationship("InboxReply", back_populates="message")


class InboxReply(Base):
    __tablename__ = "inbox_replies"
    
    id = Column(Integer, primary_key=True, index=True)
    inbox_message_id = Column(Integer, ForeignKey("inbox_messages.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, server_default=func.now())
    status = Column(String(50), default="sent")
    
    message = relationship("InboxMessage", back_populates="replies")


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    platform = Column(String(50), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    posts_count = Column(Integer, default=0)
    engagement_rate = Column(DECIMAL(5, 2))
    impressions = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    profile_views = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class PostAnalytics(Base):
    __tablename__ = "post_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    scheduled_post_id = Column(Integer, ForeignKey("scheduled_posts.id", ondelete="CASCADE"))
    impressions = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    engagement_rate = Column(DECIMAL(5, 2))
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    post = relationship("ScheduledPost", back_populates="analytics")


class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String(50), default="active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="campaigns")
    campaign_posts = relationship("CampaignPost", back_populates="campaign")


class CampaignPost(Base):
    __tablename__ = "campaign_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"))
    scheduled_post_id = Column(Integer, ForeignKey("scheduled_posts.id", ondelete="CASCADE"))
    
    campaign = relationship("Campaign", back_populates="campaign_posts")
    post = relationship("ScheduledPost", back_populates="campaign_posts")


class ListeningTopic(Base):
    __tablename__ = "listening_topics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    keyword = Column(String(255), nullable=False)
    platforms = Column(ARRAY(Text), default=["tiktok", "instagram", "youtube", "facebook"])
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="listening_topics")
    results = relationship("ListeningResult", back_populates="topic")


class ListeningResult(Base):
    __tablename__ = "listening_results"
    
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("listening_topics.id", ondelete="CASCADE"))
    platform = Column(String(50), nullable=False)
    external_post_id = Column(String(255))
    author_username = Column(String(255))
    author_id = Column(String(255))
    content = Column(Text)
    post_url = Column(Text)
    sentiment = Column(String(50))
    engagement_score = Column(Integer, default=0)
    discovered_at = Column(DateTime, server_default=func.now())
    
    topic = relationship("ListeningTopic", back_populates="results")


class OptimalTime(Base):
    __tablename__ = "optimal_times"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    platform = Column(String(50), nullable=False)
    day_of_week = Column(Integer, nullable=False)
    hour_of_day = Column(Integer, nullable=False)
    engagement_score = Column(DECIMAL(5, 2), default=0)
    sample_size = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

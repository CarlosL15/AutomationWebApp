-- Social Media Automation Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Social media platform connections
CREATE TABLE IF NOT EXISTS platform_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'tiktok', 'instagram', 'youtube', 'facebook'
    access_token TEXT,
    refresh_token TEXT,
    platform_user_id VARCHAR(255),
    platform_username VARCHAR(255),
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, platform)
);

-- Scheduled posts for publishing
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT[], -- Array of media URLs
    scheduled_time TIMESTAMP NOT NULL,
    optimal_time_suggested TIMESTAMP, -- AI suggested optimal time
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'published', 'failed', 'draft'
    published_at TIMESTAMP,
    external_post_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Smart Inbox messages
CREATE TABLE IF NOT EXISTS inbox_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- 'comment', 'dm', 'mention', 'reply'
    external_message_id VARCHAR(255),
    sender_id VARCHAR(255),
    sender_username VARCHAR(255),
    sender_avatar_url TEXT,
    content TEXT,
    post_id VARCHAR(255), -- Related post if applicable
    parent_message_id INTEGER REFERENCES inbox_messages(id),
    is_read BOOLEAN DEFAULT FALSE,
    is_replied BOOLEAN DEFAULT FALSE,
    sentiment VARCHAR(50), -- 'positive', 'negative', 'neutral'
    received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inbox replies sent
CREATE TABLE IF NOT EXISTS inbox_replies (
    id SERIAL PRIMARY KEY,
    inbox_message_id INTEGER REFERENCES inbox_messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'sent' -- 'sent', 'failed'
);

-- Analytics data
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    snapshot_date DATE NOT NULL,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5, 2),
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    profile_views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform, snapshot_date)
);

-- Post analytics
CREATE TABLE IF NOT EXISTS post_analytics (
    id SERIAL PRIMARY KEY,
    scheduled_post_id INTEGER REFERENCES scheduled_posts(id) ON DELETE CASCADE,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5, 2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns for organizing posts
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link posts to campaigns
CREATE TABLE IF NOT EXISTS campaign_posts (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    scheduled_post_id INTEGER REFERENCES scheduled_posts(id) ON DELETE CASCADE,
    UNIQUE(campaign_id, scheduled_post_id)
);

-- Social listening keywords and topics
CREATE TABLE IF NOT EXISTS listening_topics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    platforms TEXT[] DEFAULT ARRAY['tiktok', 'instagram', 'youtube', 'facebook'],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Social listening results
CREATE TABLE IF NOT EXISTS listening_results (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES listening_topics(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    external_post_id VARCHAR(255),
    author_username VARCHAR(255),
    author_id VARCHAR(255),
    content TEXT,
    post_url TEXT,
    sentiment VARCHAR(50), -- 'positive', 'negative', 'neutral'
    engagement_score INTEGER DEFAULT 0,
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(topic_id, platform, external_post_id)
);

-- Optimal posting times (AI learned)
CREATE TABLE IF NOT EXISTS optimal_times (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0-6, Sunday-Saturday
    hour_of_day INTEGER NOT NULL, -- 0-23
    engagement_score DECIMAL(5, 2) DEFAULT 0,
    sample_size INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform, day_of_week, hour_of_day)
);

-- Create indexes for performance
CREATE INDEX idx_platform_connections_user ON platform_connections(user_id);
CREATE INDEX idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_time ON scheduled_posts(scheduled_time);
CREATE INDEX idx_inbox_messages_user ON inbox_messages(user_id);
CREATE INDEX idx_inbox_messages_unread ON inbox_messages(user_id, is_read);
CREATE INDEX idx_analytics_snapshots_user ON analytics_snapshots(user_id, platform);
CREATE INDEX idx_listening_results_topic ON listening_results(topic_id);

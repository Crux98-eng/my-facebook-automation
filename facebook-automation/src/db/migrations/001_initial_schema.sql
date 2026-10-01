-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_key VARCHAR(512) NOT NULL UNIQUE,
    cdn_url TEXT NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(100) DEFAULT 'image/png',
    file_size BIGINT DEFAULT 0,
    category VARCHAR(100) NOT NULL DEFAULT 'other',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    services JSONB DEFAULT '[]'::jsonb,
    target_audience JSONB DEFAULT '[]'::jsonb,
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    ai_analysis_status VARCHAR(50) DEFAULT 'pending',
    status VARCHAR(50) DEFAULT 'active',
    times_posted INT DEFAULT 0,
    last_posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Content Templates Table
CREATE TABLE IF NOT EXISTS content_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    tone VARCHAR(100) DEFAULT 'professional',
    cta TEXT,
    hashtag_strategy VARCHAR(100) DEFAULT 'balanced',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Generated Posts Table
CREATE TABLE IF NOT EXISTS generated_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL,
    caption TEXT NOT NULL,
    hashtags JSONB DEFAULT '[]'::jsonb,
    cta TEXT,
    target_audience JSONB DEFAULT '[]'::jsonb,
    ai_metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    facebook_post_id VARCHAR(255),
    facebook_permalink TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Facebook Accounts Table
CREATE TABLE IF NOT EXISTS facebook_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id VARCHAR(255) NOT NULL UNIQUE,
    page_name VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Facebook Engagement Table
CREATE TABLE IF NOT EXISTS facebook_engagement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generated_post_id UUID REFERENCES generated_posts(id) ON DELETE SET NULL,
    facebook_object_id VARCHAR(255) UNIQUE,
    engagement_type VARCHAR(50) NOT NULL,
    facebook_user_id VARCHAR(255),
    facebook_user_name VARCHAR(255),
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facebook_user_id VARCHAR(255),
    facebook_user_name VARCHAR(255),
    facebook_profile_url TEXT,
    email VARCHAR(255),
    phone VARCHAR(100),
    source VARCHAR(100) DEFAULT 'facebook_comment',
    generated_post_id UUID REFERENCES generated_posts(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    intent VARCHAR(100),
    lead_score INT DEFAULT 0,
    service_interest VARCHAR(255),
    message TEXT,
    business_name VARCHAR(255),
    location VARCHAR(255),
    budget VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new',
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Lead Events Table
CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Automation Settings Table
CREATE TABLE IF NOT EXISTS automation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posting_enabled BOOLEAN DEFAULT true,
    posts_per_day INT DEFAULT 2,
    posting_window_start VARCHAR(10) DEFAULT '09:00',
    posting_window_end VARCHAR(10) DEFAULT '18:00',
    auto_publish BOOLEAN DEFAULT false,
    auto_reply BOOLEAN DEFAULT false,
    lead_detection_enabled BOOLEAN DEFAULT true,
    lead_email_notifications_enabled BOOLEAN DEFAULT true,
    minimum_lead_score INT DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_last_posted ON assets(last_posted_at);
CREATE INDEX IF NOT EXISTS idx_generated_posts_status ON generated_posts(status);
CREATE INDEX IF NOT EXISTS idx_generated_posts_scheduled ON generated_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(facebook_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

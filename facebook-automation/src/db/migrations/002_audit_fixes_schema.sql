-- Migration 002: Audit Fixes Schema

-- 1. Facebook Webhook Events Table for Deduplication
CREATE TABLE IF NOT EXISTS facebook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    object_id VARCHAR(255),
    payload JSONB DEFAULT '{}'::jsonb,
    processing_status VARCHAR(50) DEFAULT 'received',
    error_message TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facebook_user_id VARCHAR(255) NOT NULL,
    channel VARCHAR(50) DEFAULT 'facebook_comment',
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    facebook_message_id VARCHAR(255) UNIQUE,
    direction VARCHAR(20) DEFAULT 'inbound',
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Extend Assets Table Metadata Columns
ALTER TABLE assets ADD COLUMN IF NOT EXISTS analysis_version INT DEFAULT 1;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS analysis_model VARCHAR(100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(50) DEFAULT 'asset-analysis-v1';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facebook_events_event_id ON facebook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_facebook_events_status ON facebook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(facebook_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

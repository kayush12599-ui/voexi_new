-- VIBROXE AI ULTIMATE - PERSISTENCE LAYER

-- 1. AI CHATS (Sessions)
CREATE TABLE IF NOT EXISTS ai_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Conversation',
    preview TEXT,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AI MESSAGES (Conversation History)
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES ai_chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    role TEXT CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    media_url TEXT, -- For image analysis
    metadata JSONB, -- For storing code blocks or math steps separately
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. AI MEMORY (Personalization)
-- Stores user preferences, skill level, and past context
CREATE TABLE IF NOT EXISTS ai_user_memory (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    skill_level TEXT DEFAULT 'intermediate' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
    interests TEXT[],
    coding_pref TEXT DEFAULT 'javascript',
    past_topics TEXT[],
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PROMPT TEMPLATES
CREATE TABLE IF NOT EXISTS ai_prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT, -- 'business', 'code', 'creative'
    title TEXT,
    prompt_text TEXT,
    icon TEXT,
    is_premium BOOLEAN DEFAULT false
);

-- RLS POLICIES
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chats" ON ai_chats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own messages" ON ai_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see own memory" ON ai_user_memory FOR ALL USING (auth.uid() = user_id);

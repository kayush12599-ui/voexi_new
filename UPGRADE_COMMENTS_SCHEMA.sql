-- UPGRADE COMMENTS TO SUPPORT VOEXI RICH MEDIA (Voice, Video, Image)

-- 1. Add Type and Media columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='type') THEN
        ALTER TABLE comments ADD COLUMN type TEXT DEFAULT 'text' CHECK (type IN ('text', 'voice', 'image', 'video'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='media_url') THEN
        ALTER TABLE comments ADD COLUMN media_url TEXT;
    END IF;
END $$;

-- 2. Add likes_count if missing (for popularity)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='likes_count') THEN
        ALTER TABLE comments ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Set existing comments to 'text' type
UPDATE comments SET type = 'text' WHERE type IS NULL;

-- 1. Profiles table mein missing XP aur Level columns jodiye
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- 2. Trigger function ko update karein (XP logic ke saath)
CREATE OR REPLACE FUNCTION public.handle_subscription_logic()
RETURNS TRIGGER AS $$
BEGIN
    -- Creator ka XP points badhao (+10 XP per subscription)
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + 10
    WHERE id = NEW.creator_id;

    -- Notification bhejo
    INSERT INTO public.notifications (user_id, type, message, actor_id, read)
    VALUES (
        NEW.creator_id,
        'subscribe',
        'started following your station signal.',
        NEW.follower_id,
        false
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Automatic Level Up Logic (Every 100 XP = +1 Level)
CREATE OR REPLACE FUNCTION public.sync_profile_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Level calculation logic: floor(xp / 100) + 1
    NEW.level := floor(NEW.xp / 100) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync level whenever XP changes
DROP TRIGGER IF EXISTS on_xp_updated ON public.profiles;
CREATE TRIGGER on_xp_updated
BEFORE UPDATE OF xp ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_level();
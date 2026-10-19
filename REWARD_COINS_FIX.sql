-- VIBROXE COIN REWARD SYSTEM CLEANUP
-- Run this in your Supabase SQL Editor

-- 1. Drop all duplicate/overloaded versions of reward_user_coins
DROP FUNCTION IF EXISTS reward_user_coins(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS reward_user_coins(INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS reward_user_coins(UUID, INTEGER);

-- 2. Create the clean, canonical version
-- Keeps only the parameters: user_id (UUID) and amount_to_add (INTEGER)
CREATE OR REPLACE FUNCTION reward_user_coins(user_id UUID, amount_to_add INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update the balance in the wallets table
    UPDATE wallets
    SET balance = COALESCE(balance, 0) + amount_to_add
    WHERE wallets.user_id = reward_user_coins.user_id;

    -- Ensure a row exists if the user doesn't have a wallet yet (Optional but safe)
    IF NOT FOUND THEN
        INSERT INTO wallets (user_id, balance)
        VALUES (reward_user_coins.user_id, amount_to_add);
    END IF;

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Revoke all from public and grant to authenticated
REVOKE ALL ON FUNCTION reward_user_coins(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reward_user_coins(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION reward_user_coins(UUID, INTEGER) TO service_role;

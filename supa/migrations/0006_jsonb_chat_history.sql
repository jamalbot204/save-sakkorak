-- 1. Drop unique constraint that blocks multiple active sessions per user
--    (client is source of truth; multiple sessionIds can co-exist)
DROP INDEX IF EXISTS idx_one_active_session_per_user;

-- 2. Add JSONB column to store the full chat history as a single blob
--    replaces per-message rows in chat_messages for new traffic
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS chat_history JSONB;

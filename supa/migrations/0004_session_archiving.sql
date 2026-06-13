-- 1. Purge orphaned rows with NULL session_id (they are garbage data from broken sync)
UPDATE public.chat_messages SET is_deleted = true WHERE session_id IS NULL;

-- 2. Fix the dangerous workaround from migration 0003: session_id MUST NOT be NULL
ALTER TABLE public.chat_messages ALTER COLUMN session_id SET NOT NULL;

-- 3. Add archived_at timestamp for session lifecycle (null = active, non-null = archived)
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- 4. Composite index for fast history queries: fetch messages per user, per session, ordered by time
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_session_ts
ON public.chat_messages(user_id, session_id, timestamp);

-- 5. Ensure at most 1 active session per user (enforced at DB level)
--    Drops existing active-session index if a conflicting one exists from a prior run
DROP INDEX IF EXISTS idx_one_active_session_per_user;
CREATE UNIQUE INDEX idx_one_active_session_per_user
ON public.chat_sessions(user_id) 
WHERE status = 'active';

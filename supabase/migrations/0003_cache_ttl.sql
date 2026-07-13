-- Add 30-day TTL to cached AI responses.
-- Run this in Supabase Dashboard > SQL Editor (or via supabase db push).

ALTER TABLE ai_cache
  ADD COLUMN IF NOT EXISTS expires_at timestamptz
  NOT NULL DEFAULT (now() + interval '30 days');

CREATE INDEX IF NOT EXISTS ai_cache_expires_at_idx ON ai_cache (expires_at);

-- Auto-cleanup: requires pg_cron extension (Pro plan+).
-- Enable it in Supabase Dashboard > Database > Extensions, then run:
--
--   SELECT cron.schedule(
--     'cache-cleanup',
--     '0 3 * * *',
--     $$DELETE FROM public.ai_cache WHERE expires_at < now()$$
--   );
--
-- On the Free plan, manually purge with:
--   DELETE FROM ai_cache WHERE expires_at < now();

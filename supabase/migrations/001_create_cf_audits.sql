-- ClaimForge Database Setup
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/sql/new

-- ============================================================
-- 1. AUDITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS cf_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  job_name TEXT,
  claim_number TEXT,
  loss_type TEXT,
  total_billed NUMERIC,
  audit_result JSONB,
  error_message TEXT
);

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE cf_audits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Service role full access" ON cf_audits;

-- Service role has full access (used by server-side API)
CREATE POLICY "Service role full access" ON cf_audits
  FOR ALL USING (true);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS cf_audits_status_idx ON cf_audits (status);
CREATE INDEX IF NOT EXISTS cf_audits_created_at_idx ON cf_audits (created_at DESC);

-- ============================================================
-- 4. STORAGE BUCKET
-- ============================================================
-- Run this separately if needed:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'claimforge-pdfs',
--   'claimforge-pdfs',
--   false,
--   52428800,  -- 50MB
--   ARRAY['application/pdf']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Verification query
-- ============================================================
SELECT 
  tablename,
  (SELECT count(*) FROM cf_audits) as row_count
FROM pg_tables 
WHERE tablename = 'cf_audits';

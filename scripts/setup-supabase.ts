/**
 * ClaimForge Supabase Setup Script
 * Run: npx ts-node --esm scripts/setup-supabase.ts
 * Or: npx tsx scripts/setup-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zojeykqnrlsqnjyblnlx.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function setup() {
  console.log('🚀 Setting up ClaimForge Supabase infrastructure...\n')

  // 1. Create storage bucket
  console.log('📦 Creating storage bucket: claimforge-pdfs...')
  const { data: bucket, error: bucketError } = await supabase.storage.createBucket('claimforge-pdfs', {
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['application/pdf'],
  })

  if (bucketError) {
    if (bucketError.message?.includes('already exists') || bucketError.message?.includes('duplicate')) {
      console.log('  ✓ Bucket already exists — skipping')
    } else {
      console.error('  ✗ Bucket creation failed:', bucketError.message)
    }
  } else {
    console.log('  ✓ Bucket created:', bucket)
  }

  // 2. Create cf_audits table
  console.log('\n📋 Creating cf_audits table...')
  const createTableSQL = `
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
  `

  let tableError: { message: string } | null = null
  try {
    const result = await supabase.rpc('exec_sql', { sql: createTableSQL })
    tableError = result.error ? { message: result.error.message } : null
  } catch {
    tableError = { message: 'rpc not available — use Supabase SQL editor' }
  }

  if (tableError) {
    console.log('  ℹ️  Cannot run DDL via JS client directly.')
    console.log('  👉 Run this SQL in the Supabase SQL Editor:\n')
    console.log('─'.repeat(60))
    console.log(`
-- Run this in Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/zojeykqnrlsqnjyblnlx/sql/new

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

-- Enable RLS
ALTER TABLE cf_audits ENABLE ROW LEVEL SECURITY;

-- Service role policy
CREATE POLICY "Service role full access" ON cf_audits
  FOR ALL USING (true);
`)
    console.log('─'.repeat(60))
  } else {
    console.log('  ✓ Table created/verified')
  }

  // 3. Test the connection
  console.log('\n🔍 Testing Supabase connection...')
  const { error: testError } = await supabase
    .from('cf_audits')
    .select('count')
    .limit(1)

  if (testError) {
    console.log(`  ⚠️  Table not yet accessible: ${testError.message}`)
    console.log('  Run the SQL above in the Supabase dashboard first.')
  } else {
    console.log('  ✓ cf_audits table is accessible!')
  }

  console.log('\n✅ Setup complete!')
  console.log('\n📋 Next steps:')
  console.log('  1. If table SQL was printed above, run it in the Supabase SQL Editor')
  console.log('  2. Add your real ANTHROPIC_API_KEY to .env.local')
  console.log('  3. Run: npm run dev')
  console.log('  4. Open http://localhost:3000')
}

setup().catch(console.error)

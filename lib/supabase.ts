import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Public client for browser use
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export type AuditStatus = 'pending' | 'processing' | 'complete' | 'error'
export type LossType = 'water' | 'fire+smoke' | 'water+fire+smoke'

export interface RebuttalItem {
  item: string
  carrier_action: string  // "denied" | "reduced" | "questioned"
  rebuttal_text: string
  standard_citation: string
  estimated_recovery: number | null
}

export interface RebuttalResult {
  items: RebuttalItem[]
  cover_letter: string
}

export interface CfAudit {
  id: string
  created_at: string
  file_name: string
  file_path: string
  status: AuditStatus
  job_name?: string
  claim_number?: string
  loss_type?: LossType
  total_billed?: number
  audit_result?: AuditResult
  error_message?: string
  carrier?: string
  job_notes?: string
  file_type?: 'pdf' | 'esx'
  job_id?: string
  created_by?: string
  rebuttal_result?: RebuttalResult
}

export interface AuditResult {
  summary: {
    overall_score: number
    total_billed: number
    passed_count: number
    flagged_count: number
    missing_count: number
    critical_gaps: string[]
    supplement_total: number
  }
  line_items: LineItemResult[]
  missing_items: MissingItem[]
}

export interface LineItemResult {
  item: string
  status: 'pass' | 'flag' | 'missing'
  billed_qty?: number
  recommended_qty?: number
  issue?: string
  f9_suggestion?: string
  severity?: 'low' | 'medium' | 'high'
  xactimate_code?: string
  standard?: 'S-500' | 'S-700' | 'both'
}

export interface MissingItem {
  item: string
  reason: string
  xactimate_code?: string
  f9_note: string
  estimated_value?: number
  severity: 'low' | 'medium' | 'high'
  standard?: 'S-500' | 'S-700' | 'both'
}

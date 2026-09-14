import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runAudit } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 300  // 5 minutes — audit needs time; after() keeps function alive post-response

export async function POST(request: NextRequest) {
  try {
    const { auditId } = await request.json()

    if (!auditId) {
      return NextResponse.json({ error: 'auditId is required' }, { status: 400 })
    }

    // Fetch the audit record
    const { data: audit, error: fetchError } = await supabaseAdmin
      .from('cf_audits')
      .select('*')
      .eq('id', auditId)
      .single()

    if (fetchError || !audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    if (audit.status !== 'pending') {
      return NextResponse.json({ error: `Audit is already in status: ${audit.status}` }, { status: 400 })
    }

    // Use after() so the audit keeps running after the response is sent
    // Without this, Vercel terminates the function immediately on response and kills the audit
    after(async () => {
      await runAudit(
        auditId,
        audit.file_path,
        audit.loss_type,
        audit.file_type,
        audit.job_name,
        audit.claim_number,
        audit.carrier,
        audit.job_notes,
      ).catch((err) => {
        console.error(`Background audit failed for ${auditId}:`, err)
      })
    })

    return NextResponse.json({ auditId })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

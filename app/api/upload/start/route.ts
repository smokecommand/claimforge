import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runAudit } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

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

    if (audit.status !== 'uploading') {
      return NextResponse.json({ error: `Audit is already in status: ${audit.status}` }, { status: 400 })
    }

    // Mark as pending
    await supabaseAdmin
      .from('cf_audits')
      .update({ status: 'pending' })
      .eq('id', auditId)

    // Kick off audit in background
    runAudit(
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

    return NextResponse.json({ auditId })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runAudit } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch the existing audit record
    const { data: audit, error: fetchError } = await supabaseAdmin
      .from('cf_audits')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    // Reset audit status
    const { error: resetError } = await supabaseAdmin
      .from('cf_audits')
      .update({
        status: 'pending',
        audit_result: null,
        error_message: null,
        rebuttal_result: null,
      })
      .eq('id', id)

    if (resetError) {
      throw new Error(`Failed to reset audit: ${resetError.message}`)
    }

    // Re-run audit with same parameters
    const fileType = (audit.file_type as 'pdf' | 'esx') || 'pdf'
    runAudit(
      id,
      audit.file_path,
      audit.loss_type || 'fire+smoke',
      fileType,
      audit.job_name,
      audit.claim_number,
      audit.carrier,
      audit.job_notes
    ).catch((err) => {
      console.error(`Re-audit failed for ${id}:`, err)
    })

    return NextResponse.json({ success: true, auditId: id })
  } catch (error) {
    console.error('Retry route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

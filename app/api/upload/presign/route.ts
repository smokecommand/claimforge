import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

function detectFileType(fileName: string): 'pdf' | 'esx' | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.esx')) return 'esx'
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileName, lossType, jobName, claimNumber, carrier, jobNotes } = body

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 })
    }

    const fileType = detectFileType(fileName)
    if (!fileType) {
      return NextResponse.json({ error: 'Only PDF and ESX files are accepted' }, { status: 400 })
    }

    const auditId = uuidv4()
    const filePath = `${auditId}.${fileType}`

    // Create audit record immediately (status: uploading)
    const { error: insertError } = await supabaseAdmin
      .from('cf_audits')
      .insert({
        id: auditId,
        file_name: fileName,
        file_path: filePath,
        status: 'uploading',
        job_name: jobName || null,
        claim_number: claimNumber || null,
        loss_type: lossType || 'fire+smoke',
        carrier: carrier || null,
        job_notes: jobNotes || null,
        file_type: fileType,
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Generate signed upload URL (client uploads directly to Supabase)
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('claimforge-pdfs')
      .createSignedUploadUrl(filePath)

    if (signedError || !signedData) {
      await supabaseAdmin.from('cf_audits').delete().eq('id', auditId)
      return NextResponse.json({ error: signedError?.message || 'Failed to create upload URL' }, { status: 500 })
    }

    return NextResponse.json({
      auditId,
      filePath,
      signedUrl: signedData.signedUrl,
      token: signedData.token,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runAudit } from '@/lib/anthropic'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'
export const maxDuration = 60

// Need uuid package or use crypto
function generateId(): string {
  return uuidv4()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const jobName = formData.get('jobName') as string | undefined
    const claimNumber = formData.get('claimNumber') as string | undefined
    const lossType = (formData.get('lossType') as string) || 'fire+smoke'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 50MB' }, { status: 400 })
    }

    // Generate unique audit ID
    const auditId = generateId()
    const filePath = `${auditId}.pdf`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Upload PDF to Supabase storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('claimforge-pdfs')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Create audit record in database
    const { error: insertError } = await supabaseAdmin
      .from('cf_audits')
      .insert({
        id: auditId,
        file_name: file.name,
        file_path: filePath,
        status: 'pending',
        job_name: jobName || null,
        claim_number: claimNumber || null,
        loss_type: lossType,
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      // Clean up the uploaded file
      await supabaseAdmin.storage.from('claimforge-pdfs').remove([filePath])
      return NextResponse.json(
        { error: `Failed to create audit record: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Run audit asynchronously (fire and forget for MVP)
    // We don't await this — we return immediately with the auditId
    // and the client polls /api/audit/[id] for status
    runAudit(auditId, filePath, lossType, jobName, claimNumber).catch((err) => {
      console.error(`Background audit failed for ${auditId}:`, err)
    })

    return NextResponse.json({ auditId }, { status: 201 })
  } catch (error) {
    console.error('Upload route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

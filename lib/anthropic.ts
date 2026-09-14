import Anthropic from '@anthropic-ai/sdk'
import { PDFParse } from 'pdf-parse'
import { supabaseAdmin, AuditResult } from './supabase'
import { CLAIMFORGE_SYSTEM_PROMPT, buildUserPrompt } from './prompts'
import { parseEsxFile } from './esx-parser'
import { sendAuditNotification } from './notifications'

// Lazy init — avoid crashing the module on Vercel if key is missing at load time
let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: pdfBuffer })
  const result = await parser.getText()
  return result.text
}

export async function runAudit(
  auditId: string,
  filePath: string,
  lossType: string,
  fileType: 'pdf' | 'esx' = 'pdf',
  jobName?: string,
  claimNumber?: string,
  carrier?: string,
  jobNotes?: string
): Promise<void> {
  try {
    // Update status to processing
    await supabaseAdmin
      .from('cf_audits')
      .update({ status: 'processing' })
      .eq('id', auditId)

    // Download file from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('claimforge-pdfs')
      .download(filePath)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`)
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Extract text based on file type
    let estimateText: string
    try {
      if (fileType === 'esx') {
        estimateText = await parseEsxFile(fileBuffer)
      } else {
        estimateText = await extractPdfText(fileBuffer)
      }
    } catch (e) {
      throw new Error(
        `Failed to extract text from ${fileType.toUpperCase()}: ${e instanceof Error ? e.message : String(e)}`
      )
    }

    if (!estimateText || estimateText.trim().length < 100) {
      throw new Error(
        `Text extraction returned insufficient content. The ${fileType.toUpperCase()} may be invalid or encrypted.`
      )
    }

    // Build the user prompt
    const userPrompt = buildUserPrompt(estimateText, lossType, jobName, claimNumber, carrier, jobNotes)

    // Call Claude
    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: CLAIMFORGE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract the text content
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    // Parse JSON response
    let auditResult: AuditResult
    try {
      // Strip any potential markdown code fences
      const cleanJson = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      auditResult = JSON.parse(cleanJson)
    } catch (e) {
      throw new Error(`Failed to parse Claude response as JSON: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Extract total_billed from audit result if available
    const totalBilled = auditResult.summary?.total_billed || null

    // Update the audit record with results
    const { error: updateError } = await supabaseAdmin
      .from('cf_audits')
      .update({
        status: 'complete',
        audit_result: auditResult,
        total_billed: totalBilled,
      })
      .eq('id', auditId)

    if (updateError) {
      throw new Error(`Failed to save audit results: ${updateError.message}`)
    }

    // Send completion notification (best-effort)
    await sendAuditNotification(
      auditId,
      jobName,
      'complete',
      auditResult.summary?.overall_score,
      auditResult.summary?.supplement_total
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Audit ${auditId} failed:`, errorMessage)

    // Update status to error
    await supabaseAdmin
      .from('cf_audits')
      .update({
        status: 'error',
        error_message: errorMessage,
      })
      .eq('id', auditId)

    // Send error notification (best-effort)
    await sendAuditNotification(auditId, jobName, 'error')
  }
}

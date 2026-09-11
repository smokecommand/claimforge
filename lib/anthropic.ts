import Anthropic from '@anthropic-ai/sdk'
import { PDFParse } from 'pdf-parse'
import { supabaseAdmin, AuditResult } from './supabase'
import { CLAIMFORGE_SYSTEM_PROMPT, buildUserPrompt } from './prompts'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: pdfBuffer })
  const result = await parser.getText()
  return result.text
}

export async function runAudit(
  auditId: string,
  filePath: string,
  lossType: string,
  jobName?: string,
  claimNumber?: string
): Promise<void> {
  try {
    // Update status to processing
    await supabaseAdmin
      .from('cf_audits')
      .update({ status: 'processing' })
      .eq('id', auditId)

    // Download PDF from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('claimforge-pdfs')
      .download(filePath)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download PDF: ${downloadError?.message}`)
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)

    // Extract text from PDF
    let pdfText: string
    try {
      pdfText = await extractPdfText(pdfBuffer)
    } catch (e) {
      throw new Error(`Failed to extract PDF text: ${e instanceof Error ? e.message : String(e)}`)
    }

    if (!pdfText || pdfText.trim().length < 100) {
      throw new Error('PDF text extraction returned insufficient content. The PDF may be image-based or encrypted.')
    }

    // Build the user prompt
    const userPrompt = buildUserPrompt(pdfText, lossType, jobName, claimNumber)

    // Call Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
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
  }
}

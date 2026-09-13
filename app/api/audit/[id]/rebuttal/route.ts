import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const REBUTTAL_SYSTEM_PROMPT = `You are ClaimForge's rebuttal specialist. You write formal, citation-backed rebuttal letters for restoration contractors when insurance carriers deny or cut estimate line items.

For each denied/cut item, write:
1. The specific standard section that requires it (S-500 or S-700 section number and title)
2. Why the denial is incorrect
3. Supporting industry precedent if applicable
4. A formal rebuttal paragraph ready to send to the adjuster

Also write a professional cover letter to accompany the rebuttal.

Return JSON:
{
  "cover_letter": "<formal letter text>",
  "items": [
    {
      "item": "<item name>",
      "carrier_action": "<denied|reduced|questioned>",
      "rebuttal_text": "<full rebuttal paragraph>",
      "standard_citation": "<e.g. ANSI/IICRC S-700 §7.3.2 — HVAC Assessment>",
      "estimated_recovery": <number or null>
    }
  ]
}

Return ONLY valid JSON. No markdown, no explanation outside the JSON.`

interface DeniedItem {
  item: string
  action: string
  amount_cut?: number
}

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

    if (audit.status !== 'complete') {
      return NextResponse.json({ error: 'Audit must be complete before generating rebuttal' }, { status: 400 })
    }

    const body = await request.json()
    const deniedItems: DeniedItem[] = body.denied_items || []

    if (deniedItems.length === 0) {
      return NextResponse.json({ error: 'No denied items provided' }, { status: 400 })
    }

    // Build the rebuttal prompt
    const itemsText = deniedItems
      .map((di, i) => {
        let line = `${i + 1}. Item: ${di.item}`
        line += `\n   Action: ${di.action}`
        if (di.amount_cut != null) line += `\n   Amount cut: $${di.amount_cut}`
        return line
      })
      .join('\n\n')

    const auditSummary = audit.audit_result?.summary
    const userPrompt = `## REBUTTAL REQUEST

**Job:** ${audit.job_name || 'Unnamed Job'}
**Claim Number:** ${audit.claim_number || 'Not provided'}
**Carrier:** ${audit.carrier || 'Not specified'}
**Loss Type:** ${audit.loss_type || 'Not specified'}

## CARRIER ACTIONS TO REBUT

${itemsText}

## CONTEXT FROM AUDIT

Audit Score: ${auditSummary?.overall_score ?? 'N/A'}/100
Total Billed: $${auditSummary?.total_billed ?? 'Unknown'}
Critical Gaps Noted: ${(auditSummary?.critical_gaps ?? []).join('; ') || 'None'}

Please generate a formal rebuttal letter with specific IICRC S-500/S-700 citations for each denied/cut item, plus a professional cover letter.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: REBUTTAL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    // Parse JSON
    let rebuttalResult
    try {
      const cleanJson = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      rebuttalResult = JSON.parse(cleanJson)
    } catch (e) {
      throw new Error(`Failed to parse rebuttal response: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Store in DB
    const { error: updateError } = await supabaseAdmin
      .from('cf_audits')
      .update({ rebuttal_result: rebuttalResult })
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to save rebuttal: ${updateError.message}`)
    }

    return NextResponse.json({ rebuttal: rebuttalResult })
  } catch (error) {
    console.error('Rebuttal route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

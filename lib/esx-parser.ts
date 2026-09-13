import AdmZip from 'adm-zip'

function getTextContent(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  const matches: string[] = []
  let match
  while ((match = regex.exec(xml)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text) matches.push(text)
  }
  return matches.join(' | ')
}

function getAttr(xml: string, attr: string): string {
  const regex = new RegExp(`${attr}="([^"]*)"`, 'i')
  const m = regex.exec(xml)
  return m ? m[1].trim() : ''
}

function getTagValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i')
  const m = regex.exec(xml)
  return m ? m[1].trim() : ''
}

function extractLineItems(xml: string): string[] {
  const lines: string[] = []

  // Try various element names Xactimate uses
  const itemPatterns = [
    /<LineItem[\s>]([\s\S]*?)<\/LineItem>/gi,
    /<Item[\s>]([\s\S]*?)<\/Item>/gi,
    /<Claim_Item[\s>]([\s\S]*?)<\/Claim_Item>/gi,
    /<LINEITEM[\s>]([\s\S]*?)<\/LINEITEM>/gi,
    /<li[\s>]([\s\S]*?)<\/li>/gi,
  ]

  let found = false
  for (const pattern of itemPatterns) {
    const matches: RegExpExecArray[] = []
    let m
    while ((m = pattern.exec(xml)) !== null) {
      matches.push(m)
    }

    if (matches.length > 0) {
      found = true
      for (const match of matches) {
        const itemXml = match[0]

        // Extract common fields from both attributes and child elements
        const code =
          getAttr(itemXml, 'Code') ||
          getAttr(itemXml, 'code') ||
          getTagValue(itemXml, 'Code') ||
          getTagValue(itemXml, 'code') ||
          getTagValue(itemXml, 'ItemCode') ||
          ''

        const desc =
          getAttr(itemXml, 'Description') ||
          getAttr(itemXml, 'Desc') ||
          getTagValue(itemXml, 'Description') ||
          getTagValue(itemXml, 'Desc') ||
          getTagValue(itemXml, 'ItemDescription') ||
          getTagValue(itemXml, 'Name') ||
          ''

        const qty =
          getAttr(itemXml, 'Quantity') ||
          getAttr(itemXml, 'Qty') ||
          getTagValue(itemXml, 'Quantity') ||
          getTagValue(itemXml, 'Qty') ||
          getTagValue(itemXml, 'Qnty') ||
          ''

        const unit =
          getAttr(itemXml, 'Unit') ||
          getTagValue(itemXml, 'Unit') ||
          getTagValue(itemXml, 'UnitType') ||
          ''

        const unitPrice =
          getAttr(itemXml, 'UnitPrice') ||
          getAttr(itemXml, 'Price') ||
          getTagValue(itemXml, 'UnitPrice') ||
          getTagValue(itemXml, 'Price') ||
          getTagValue(itemXml, 'UnitCost') ||
          ''

        const total =
          getAttr(itemXml, 'Total') ||
          getAttr(itemXml, 'LineTotal') ||
          getTagValue(itemXml, 'Total') ||
          getTagValue(itemXml, 'LineTotal') ||
          getTagValue(itemXml, 'Amount') ||
          ''

        const f9 =
          getTagValue(itemXml, 'Notes') ||
          getTagValue(itemXml, 'F9') ||
          getTagValue(itemXml, 'Note') ||
          getTagValue(itemXml, 'Comment') ||
          getTagValue(itemXml, 'Narrative') ||
          ''

        if (code || desc) {
          let line = `${code || '[no code]'} | ${desc || '[no description]'}`
          if (qty) line += ` | Qty: ${qty}${unit ? ' ' + unit : ''}`
          if (unitPrice) line += ` | Unit Price: $${unitPrice}`
          if (total) line += ` | Total: $${total}`
          lines.push(line)
          if (f9) lines.push(`  F9: ${f9}`)
          lines.push('---')
        }
      }
      break
    }
  }

  if (!found) {
    // Fallback: try to get any structured data from the XML
    // Look for anything that looks like a dollar amount with a label
    const moneyPattern = /([A-Za-z][A-Za-z\s]{2,40})[:\s]+\$?([\d,]+\.?\d*)/g
    let m
    const seen = new Set<string>()
    while ((m = moneyPattern.exec(xml)) !== null) {
      const key = m[1].trim()
      if (!seen.has(key) && key.length < 50) {
        seen.add(key)
        lines.push(`${key}: $${m[2]}`)
      }
    }
  }

  return lines
}

function extractJobInfo(xml: string): { job: string; claim: string; carrier: string; date: string } {
  const job =
    getTagValue(xml, 'JobName') ||
    getTagValue(xml, 'Job_Name') ||
    getTagValue(xml, 'PropertyName') ||
    getAttr(xml, 'JobName') ||
    getAttr(xml, 'jobName') ||
    ''

  const claim =
    getTagValue(xml, 'ClaimNumber') ||
    getTagValue(xml, 'Claim_Number') ||
    getTagValue(xml, 'ClaimNo') ||
    getAttr(xml, 'ClaimNumber') ||
    getAttr(xml, 'claimNumber') ||
    ''

  const carrier =
    getTagValue(xml, 'InsuranceCompany') ||
    getTagValue(xml, 'Carrier') ||
    getTagValue(xml, 'Insurance') ||
    getTagValue(xml, 'InsuranceCo') ||
    getAttr(xml, 'InsuranceCompany') ||
    getAttr(xml, 'carrier') ||
    ''

  const date =
    getTagValue(xml, 'LossDate') ||
    getTagValue(xml, 'DateOfLoss') ||
    getTagValue(xml, 'Date') ||
    getTagValue(xml, 'EstimateDate') ||
    getAttr(xml, 'LossDate') ||
    getAttr(xml, 'date') ||
    ''

  return { job, claim, carrier, date }
}

function extractTotals(xml: string): { subtotal: string; op: string; total: string } {
  const subtotal =
    getTagValue(xml, 'Subtotal') ||
    getTagValue(xml, 'SubTotal') ||
    getTagValue(xml, 'LineItemTotal') ||
    getAttr(xml, 'Subtotal') ||
    ''

  const op =
    getTagValue(xml, 'OP') ||
    getTagValue(xml, 'OandP') ||
    getTagValue(xml, 'OverheadAndProfit') ||
    getTagValue(xml, 'OAndP') ||
    ''

  const total =
    getTagValue(xml, 'Total') ||
    getTagValue(xml, 'GrandTotal') ||
    getTagValue(xml, 'TotalAmount') ||
    getAttr(xml, 'Total') ||
    ''

  return { subtotal, op, total }
}

export async function parseEsxFile(buffer: Buffer): Promise<string> {
  try {
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()

    if (entries.length === 0) {
      throw new Error('ESX file appears to be empty or invalid ZIP archive')
    }

    // Collect all XML content
    const xmlContents: { name: string; content: string }[] = []
    let allText = ''

    for (const entry of entries) {
      if (entry.isDirectory) continue
      const name = entry.entryName.toLowerCase()
      if (name.endsWith('.xml')) {
        const content = entry.getData().toString('utf8')
        xmlContents.push({ name: entry.entryName, content })
      } else if (name.endsWith('.txt') || name.endsWith('.csv')) {
        allText += `\n=== ${entry.entryName} ===\n${entry.getData().toString('utf8')}\n`
      }
    }

    if (xmlContents.length === 0 && !allText) {
      // Return list of entries as fallback
      return `=== ESX ESTIMATE IMPORT ===\nFile entries: ${entries.map((e) => e.entryName).join(', ')}\n\nNo readable XML content found.`
    }

    // Parse the primary XML (largest file is usually the estimate)
    const primaryXml =
      xmlContents.find((x) => x.name.toLowerCase().includes('estimate')) ||
      xmlContents.find((x) => x.name.toLowerCase().includes('claim')) ||
      xmlContents.reduce((a, b) => (a.content.length > b.content.length ? a : b), xmlContents[0])

    const allXml = xmlContents.map((x) => x.content).join('\n')

    const jobInfo = extractJobInfo(allXml)
    const lineItems = extractLineItems(allXml)
    const totals = extractTotals(allXml)

    const output: string[] = [
      '=== ESX ESTIMATE IMPORT ===',
      `Job: ${jobInfo.job || 'Not found'}`,
      `Claim: ${jobInfo.claim || 'Not found'}`,
      `Carrier: ${jobInfo.carrier || 'Not found'}`,
      `Date: ${jobInfo.date || 'Not found'}`,
      '',
    ]

    if (lineItems.length > 0) {
      output.push('=== LINE ITEMS ===')
      output.push(...lineItems)
      output.push('')
    }

    if (totals.subtotal || totals.op || totals.total) {
      output.push('=== TOTALS ===')
      if (totals.subtotal) output.push(`Subtotal: $${totals.subtotal}`)
      if (totals.op) output.push(`O&P: $${totals.op}`)
      if (totals.total) output.push(`Total: $${totals.total}`)
      output.push('')
    }

    // Include raw XML text for any additional data Claude might find
    if (primaryXml) {
      output.push('=== RAW XML DATA ===')
      // Truncate to ~50KB to stay within token limits
      const rawText = primaryXml.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      output.push(rawText.substring(0, 50000))
    }

    if (allText) {
      output.push('=== ADDITIONAL FILES ===')
      output.push(allText.substring(0, 10000))
    }

    return output.join('\n')
  } catch (err) {
    throw new Error(
      `Failed to parse ESX file: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

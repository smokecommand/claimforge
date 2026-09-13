'use client'

import { useState } from 'react'
import { AuditResult, CfAudit, RebuttalResult, RebuttalItem } from '@/lib/supabase'
import { SeverityBadge, ItemStatusBadge, StandardBadge } from './StatusBadge'

interface AuditResultProps {
  audit: CfAudit
}

function ScoreGauge({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score))
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDash = (clampedScore / 100) * circumference

  const getColor = (s: number) => {
    if (s >= 80) return '#10b981'
    if (s >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const color = getColor(clampedScore)

  const getLabel = (s: number) => {
    if (s >= 85) return 'Strong'
    if (s >= 70) return 'Good'
    if (s >= 55) return 'Needs Work'
    return 'At Risk'
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" className="transform -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#1f2937" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
        />
      </svg>
      <div className="text-center -mt-20">
        <div className="text-5xl font-bold" style={{ color }}>{clampedScore}</div>
        <div className="text-gray-400 text-sm mt-1">{getLabel(clampedScore)}</div>
      </div>
    </div>
  )
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-amber-400 hover:text-amber-300 border border-amber-800 hover:border-amber-600 px-2 py-1 rounded transition-colors"
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

function SaveToLibraryButton({
  itemName,
  xactimateCode,
  lossType,
  carrier,
  f9Text,
  category,
}: {
  itemName: string
  xactimateCode?: string | null
  lossType?: string | null
  carrier?: string | null
  f9Text: string
  category: string
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const handleSave = async () => {
    setState('saving')
    try {
      const res = await fetch('/api/f9-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          item_name: itemName,
          xactimate_code: xactimateCode || null,
          loss_type: lossType || 'all',
          carrier: carrier || null,
          f9_text: f9Text,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setState('saved')
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  if (state === 'saved') {
    return (
      <span className="text-xs text-emerald-400 border border-emerald-800 px-2 py-1 rounded">
        ✓ Saved
      </span>
    )
  }

  return (
    <button
      onClick={handleSave}
      disabled={state === 'saving'}
      className="text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition-colors disabled:opacity-50"
    >
      {state === 'saving' ? '...' : state === 'error' ? '✗ Error' : '💾 Save'}
    </button>
  )
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

// ─── Rebuttal Tab ──────────────────────────────────────────────────────────────

interface DeniedItem {
  item: string
  action: string
  amount_cut: string
}

function RebuttalTab({ audit }: { audit: CfAudit }) {
  const existingRebuttal = audit.rebuttal_result as RebuttalResult | undefined

  const [items, setItems] = useState<DeniedItem[]>(
    existingRebuttal
      ? []
      : [{ item: '', action: 'denied', amount_cut: '' }]
  )
  const [rebuttal, setRebuttal] = useState<RebuttalResult | null>(existingRebuttal || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addItem = () => {
    setItems((prev) => [...prev, { item: '', action: 'denied', amount_cut: '' }])
  }

  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  const updateItem = (i: number, field: keyof DeniedItem, value: string) => {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)))
  }

  const handleGenerate = async () => {
    const validItems = items.filter((it) => it.item.trim())
    if (validItems.length === 0) {
      setError('Add at least one denied item')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/audit/${audit.id}/rebuttal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          denied_items: validItems.map((it) => ({
            item: it.item.trim(),
            action: it.action,
            amount_cut: it.amount_cut ? parseFloat(it.amount_cut) : undefined,
          })),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate rebuttal')
      setRebuttal(data.rebuttal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate rebuttal')
    } finally {
      setIsGenerating(false)
    }
  }

  if (rebuttal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-200 font-semibold">Carrier Rebuttal</h3>
          <button
            onClick={() => { setRebuttal(null); setItems([{ item: '', action: 'denied', amount_cut: '' }]) }}
            className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition-colors"
          >
            ↺ New Rebuttal
          </button>
        </div>

        {/* Cover Letter */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-amber-400 font-semibold text-sm uppercase tracking-wider">📝 Cover Letter</h4>
            <CopyButton text={rebuttal.cover_letter} label="Copy Letter" />
          </div>
          <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
            {rebuttal.cover_letter}
          </pre>
        </div>

        {/* Rebuttal Items */}
        <div className="space-y-4">
          {rebuttal.items.map((item: RebuttalItem, i: number) => (
            <div key={i} className="bg-gray-900 border border-amber-900/50 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-gray-200 font-medium">{item.item}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      item.carrier_action === 'denied'
                        ? 'text-red-400 border-red-800 bg-red-950/30'
                        : item.carrier_action === 'reduced'
                          ? 'text-amber-400 border-amber-800 bg-amber-950/30'
                          : 'text-blue-400 border-blue-800 bg-blue-950/30'
                    }`}>
                      {item.carrier_action}
                    </span>
                    {item.estimated_recovery != null && (
                      <span className="text-emerald-400 text-xs">~{formatCurrency(item.estimated_recovery)} recovery</span>
                    )}
                  </div>
                </div>
                <CopyButton text={item.rebuttal_text} label="Copy Rebuttal" />
              </div>
              <div className="text-amber-400 text-xs font-medium mb-2">📌 {item.standard_citation}</div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-300 text-xs leading-relaxed">{item.rebuttal_text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-950/20 border border-amber-800 rounded-xl p-4 text-sm text-amber-300">
        <strong>🔥 Carrier denied or cut your estimate?</strong> Enter the items below and ClaimForge will generate a formal, citation-backed rebuttal letter.
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <input
                  type="text"
                  value={item.item}
                  onChange={(e) => updateItem(i, 'item', e.target.value)}
                  placeholder="Line item name (e.g. Antimicrobial Treatment, Equipment Monitoring)"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Action</label>
                    <select
                      value={item.action}
                      onChange={(e) => updateItem(i, 'action', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-amber-500 text-sm"
                    >
                      <option value="denied">Denied</option>
                      <option value="reduced">Reduced</option>
                      <option value="questioned">Questioned</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Amount Cut ($)</label>
                    <input
                      type="number"
                      value={item.amount_cut}
                      onChange={(e) => updateItem(i, 'amount_cut', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 text-sm"
                    />
                  </div>
                </div>
              </div>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(i)}
                  className="text-gray-600 hover:text-red-400 transition-colors mt-2 text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="w-full py-2 border border-dashed border-gray-700 hover:border-amber-600 text-gray-500 hover:text-amber-400 rounded-xl text-sm transition-colors"
      >
        + Add Item
      </button>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/30 border border-red-800 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`
          w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200
          ${!isGenerating
            ? 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }
        `}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating Rebuttal...
          </span>
        ) : (
          '🔥 Generate Rebuttal Letter'
        )}
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditResultDisplay({ audit }: AuditResultProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'line-items' | 'missing' | 'supplement' | 'rebuttal'>('summary')

  const result = audit.audit_result as AuditResult

  if (!result) return null

  const { summary, line_items = [], missing_items = [] } = result

  const tabs = [
    { id: 'summary', label: '📊 Summary', count: null },
    { id: 'line-items', label: '📋 Line Items', count: (summary?.passed_count ?? 0) + (summary?.flagged_count ?? 0) },
    { id: 'missing', label: '❌ Missing Items', count: summary?.missing_count ?? missing_items.length },
    { id: 'supplement', label: '📝 Supplement', count: null },
    { id: 'rebuttal', label: '🔥 Rebuttal', count: null },
  ] as const

  // Build supplement text
  const supplementText = [
    `SUPPLEMENT — ${audit.job_name || 'Unnamed Job'} | Claim: ${audit.claim_number || 'N/A'}`,
    `Audit Score: ${summary?.overall_score}/100 | Estimated Supplement Value: ${formatCurrency(summary?.supplement_total)}`,
    '',
    '═══════════════════════════════════════════════════════',
    'FLAGGED LINE ITEMS — F9 CORRECTIONS',
    '═══════════════════════════════════════════════════════',
    '',
    ...line_items
      .filter((li) => li.status === 'flag' && li.f9_suggestion)
      .map((li) => [
        `LINE ITEM: ${li.item}${li.xactimate_code ? ` (${li.xactimate_code})` : ''}`,
        `ISSUE: ${li.issue || ''}`,
        `F9 NOTE: ${li.f9_suggestion}`,
        '',
      ])
      .flat(),
    '═══════════════════════════════════════════════════════',
    'MISSING LINE ITEMS — SUPPLEMENT ADDITIONS',
    '═══════════════════════════════════════════════════════',
    '',
    ...missing_items.map((mi) => [
      `LINE ITEM: ${mi.item}${mi.xactimate_code ? ` (${mi.xactimate_code})` : ''}`,
      `REASON: ${mi.reason}`,
      `ESTIMATED VALUE: ${formatCurrency(mi.estimated_value)}`,
      `F9 NOTE: ${mi.f9_note}`,
      '',
    ]).flat(),
  ].join('\n')

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {/* Score Gauge */}
        <div className="sm:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-center print:hidden">
          <ScoreGauge score={summary?.overall_score ?? 0} />
        </div>

        {/* Stat Cards */}
        <div className="sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-500 text-xs font-medium uppercase tracking-wider">Total Billed</div>
            <div className="text-gray-100 text-xl font-bold mt-1">{formatCurrency(summary?.total_billed)}</div>
          </div>
          <div className="bg-gray-900 border border-emerald-900 rounded-xl p-4">
            <div className="text-emerald-500 text-xs font-medium uppercase tracking-wider">Passed</div>
            <div className="text-emerald-400 text-2xl font-bold mt-1">{summary?.passed_count ?? 0}</div>
          </div>
          <div className="bg-gray-900 border border-amber-900 rounded-xl p-4">
            <div className="text-amber-500 text-xs font-medium uppercase tracking-wider">Flagged</div>
            <div className="text-amber-400 text-2xl font-bold mt-1">{summary?.flagged_count ?? 0}</div>
          </div>
          <div className="bg-gray-900 border border-red-900 rounded-xl p-4">
            <div className="text-red-500 text-xs font-medium uppercase tracking-wider">Missing</div>
            <div className="text-red-400 text-2xl font-bold mt-1">{summary?.missing_count ?? missing_items.length}</div>
          </div>
        </div>
      </div>

      {/* Supplement Value Banner */}
      {summary?.supplement_total && summary.supplement_total > 0 && (
        <div className="bg-amber-950/20 border border-amber-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-amber-300 font-semibold">💰 Estimated Supplement Opportunity</div>
            <div className="text-gray-400 text-sm mt-0.5">Missing and underbilled scope identified by ClaimForge</div>
          </div>
          <div className="text-amber-400 text-2xl font-bold">{formatCurrency(summary.supplement_total)}</div>
        </div>
      )}

      {/* Print + Actions bar */}
      <div className="flex items-center justify-end gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
        >
          🖨️ Download PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 print:hidden">
        <nav className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
                }
              `}
            >
              {tab.label}
              {tab.count != null && (
                <span className="ml-1.5 text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-gray-200 font-semibold mb-3">🚨 Critical Gaps</h3>
              {summary?.critical_gaps && summary.critical_gaps.length > 0 ? (
                <ul className="space-y-2">
                  {summary.critical_gaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-300">
                      <span className="text-red-500 mt-0.5">✕</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-emerald-400 text-sm">No critical gaps identified.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-gray-200 font-semibold mb-3">📊 Audit Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Items checked</span>
                    <span className="text-gray-300">{line_items.length + missing_items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-400">✓ Passed</span>
                    <span className="text-emerald-400">{summary?.passed_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-400">⚠ Flagged</span>
                    <span className="text-amber-400">{summary?.flagged_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-400">✕ Missing</span>
                    <span className="text-red-400">{summary?.missing_count ?? missing_items.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-gray-200 font-semibold mb-3">💼 Job Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Job Name</span>
                    <span className="text-gray-300">{audit.job_name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Claim #</span>
                    <span className="text-gray-300">{audit.claim_number || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Carrier</span>
                    <span className="text-gray-300">{audit.carrier || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Loss Type</span>
                    <span className="text-gray-300">{audit.loss_type || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">File Type</span>
                    <span className="text-gray-300 uppercase">{audit.file_type || 'PDF'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">File</span>
                    <span className="text-gray-300 truncate max-w-32">{audit.file_name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Line Items Tab */}
        {activeTab === 'line-items' && (
          <div className="space-y-3">
            {line_items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No line items analyzed.</p>
            ) : (
              line_items.map((item, i) => (
                <div
                  key={i}
                  className={`bg-gray-900 border rounded-xl p-4 ${
                    item.status === 'pass'
                      ? 'border-gray-800'
                      : item.status === 'flag'
                        ? 'border-amber-900'
                        : 'border-red-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ItemStatusBadge status={item.status} />
                        {item.severity && item.status !== 'pass' && <SeverityBadge severity={item.severity} />}
                        {item.status !== 'pass' && item.standard && <StandardBadge standard={item.standard} />}
                        <span className="text-gray-200 font-medium">{item.item}</span>
                        {item.xactimate_code && (
                          <span className="text-gray-500 text-xs font-mono">{item.xactimate_code}</span>
                        )}
                      </div>

                      {item.billed_qty != null && (
                        <div className="mt-1 text-xs text-gray-500">
                          Billed qty: {item.billed_qty}
                          {item.recommended_qty != null && item.recommended_qty !== item.billed_qty && (
                            <span className="text-amber-500"> → Recommended: {item.recommended_qty}</span>
                          )}
                        </div>
                      )}

                      {item.issue && (
                        <p className="mt-2 text-sm text-amber-300/80">{item.issue}</p>
                      )}

                      {item.f9_suggestion && (
                        <div className="mt-3 bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">F9 Suggestion</span>
                            <div className="flex items-center gap-1.5">
                              <SaveToLibraryButton
                                itemName={item.item}
                                xactimateCode={item.xactimate_code}
                                lossType={audit.loss_type}
                                carrier={audit.carrier}
                                f9Text={item.f9_suggestion}
                                category="Flagged Line Item"
                              />
                              <CopyButton text={item.f9_suggestion} label="Copy F9" />
                            </div>
                          </div>
                          <p className="text-gray-300 text-xs leading-relaxed">{item.f9_suggestion}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Missing Items Tab */}
        {activeTab === 'missing' && (
          <div className="space-y-3">
            {missing_items.length === 0 ? (
              <p className="text-emerald-400 text-center py-8">✓ No missing line items identified!</p>
            ) : (
              missing_items.map((item, i) => (
                <div key={i} className="bg-gray-900 border border-red-900 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge severity={item.severity} />
                        {item.standard && <StandardBadge standard={item.standard} />}
                        <span className="text-red-300 font-medium">{item.item}</span>
                        {item.xactimate_code && (
                          <span className="text-gray-500 text-xs font-mono bg-gray-800 px-2 py-0.5 rounded">
                            {item.xactimate_code}
                          </span>
                        )}
                        {item.estimated_value != null && (
                          <span className="text-amber-400 text-xs ml-auto">
                            ~{formatCurrency(item.estimated_value)}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-gray-400">{item.reason}</p>

                      <div className="mt-3 bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Ready-to-Paste F9 Note</span>
                          <div className="flex items-center gap-1.5">
                            <SaveToLibraryButton
                              itemName={item.item}
                              xactimateCode={item.xactimate_code}
                              lossType={audit.loss_type}
                              carrier={audit.carrier}
                              f9Text={item.f9_note}
                              category="Missing Item"
                            />
                            <CopyButton text={item.f9_note} label="Copy F9" />
                          </div>
                        </div>
                        <p className="text-gray-300 text-xs leading-relaxed">{item.f9_note}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Supplement Tab */}
        {activeTab === 'supplement' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Complete supplement text with all F9 notes — ready to copy into your supplement letter.</p>
              <CopyButton text={supplementText} label="Copy All" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                {supplementText}
              </pre>
            </div>
          </div>
        )}

        {/* Rebuttal Tab */}
        {activeTab === 'rebuttal' && (
          <RebuttalTab audit={audit} />
        )}
      </div>

      {/* Print-only full view */}
      <div className="hidden print:block space-y-8">
        <div>
          <h2 className="text-xl font-bold">ClaimForge Audit Report</h2>
          <p>Job: {audit.job_name || '—'} | Claim: {audit.claim_number || '—'} | Score: {summary?.overall_score ?? 0}/100</p>
          <p>Total Billed: {formatCurrency(summary?.total_billed)} | Supplement Opportunity: {formatCurrency(summary?.supplement_total)}</p>
        </div>

        <div>
          <h3 className="font-bold text-lg">Critical Gaps</h3>
          <ul>{summary?.critical_gaps?.map((g, i) => <li key={i}>• {g}</li>)}</ul>
        </div>

        <div>
          <h3 className="font-bold text-lg">Flagged Line Items</h3>
          {line_items.filter((li) => li.status === 'flag').map((li, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <strong>{li.item}</strong> — {li.issue}
              {li.f9_suggestion && <p style={{ fontSize: '0.85em' }}>F9: {li.f9_suggestion}</p>}
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-bold text-lg">Missing Line Items</h3>
          {missing_items.map((mi, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <strong>{mi.item}</strong> ({formatCurrency(mi.estimated_value)}) — {mi.reason}
              <p style={{ fontSize: '0.85em' }}>F9: {mi.f9_note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

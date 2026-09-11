'use client'

import { useState } from 'react'
import { AuditResult, CfAudit } from '@/lib/supabase'
import { SeverityBadge, ItemStatusBadge } from './StatusBadge'

interface AuditResultProps {
  audit: CfAudit
}

function ScoreGauge({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score))
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDash = (clampedScore / 100) * circumference

  const getColor = (s: number) => {
    if (s >= 80) return '#10b981' // emerald
    if (s >= 60) return '#f59e0b' // amber
    return '#ef4444' // red
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

function CopyButton({ text }: { text: string }) {
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
      {copied ? '✓ Copied' : 'Copy F9'}
    </button>
  )
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export default function AuditResultDisplay({ audit }: AuditResultProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'line-items' | 'missing' | 'supplement'>('summary')

  const result = audit.audit_result as AuditResult

  if (!result) return null

  const { summary, line_items = [], missing_items = [] } = result

  const tabs = [
    { id: 'summary', label: '📊 Summary', count: null },
    { id: 'line-items', label: '📋 Line Items', count: (summary?.passed_count ?? 0) + (summary?.flagged_count ?? 0) },
    { id: 'missing', label: '❌ Missing Items', count: summary?.missing_count ?? missing_items.length },
    { id: 'supplement', label: '📝 Supplement', count: null },
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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {/* Score Gauge */}
        <div className="sm:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-center">
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

      {/* Tabs */}
      <div className="border-b border-gray-800">
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
                    <span className="text-gray-500">Loss Type</span>
                    <span className="text-gray-300">{audit.loss_type || '—'}</span>
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
                            <CopyButton text={item.f9_suggestion} />
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
                          <CopyButton text={item.f9_note} />
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
              <CopyButton text={supplementText} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                {supplementText}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

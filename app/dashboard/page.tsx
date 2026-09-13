import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { CfAudit } from '@/lib/supabase'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800'
      : score >= 60
        ? 'text-amber-400 bg-amber-950/40 border-amber-800'
        : 'text-red-400 bg-red-950/40 border-red-800'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold border ${color}`}>
      {score}
    </span>
  )
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4 flex flex-col gap-1">
      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600">{sub}</div>}
    </div>
  )
}

// ─── HORIZONTAL BAR ──────────────────────────────────────────────────────────

function HBar({ label, value, max, suffix = '' }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-right text-xs text-gray-400 truncate flex-shrink-0">{label}</div>
      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-amber-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-12 text-xs text-gray-300 text-right flex-shrink-0">
        {value}{suffix}
      </div>
    </div>
  )
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { data: allAudits } = await supabaseAdmin
    .from('cf_audits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000)

  const audits: CfAudit[] = (allAudits ?? []) as CfAudit[]
  const complete = audits.filter((a) => a.status === 'complete')
  const processing = audits.filter((a) => a.status === 'processing')
  const error = audits.filter((a) => a.status === 'error')

  // ── Aggregate stats ──
  const totalAudits = audits.length
  const scores = complete.map((a) => a.audit_result?.summary?.overall_score).filter((s): s is number => s != null)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const totalSupplement = complete.reduce((acc, a) => acc + (a.audit_result?.summary?.supplement_total ?? 0), 0)
  const totalBilled = audits.reduce((acc, a) => acc + (a.total_billed ?? 0), 0)

  // ── Loss type breakdown ──
  const byLossType: Record<string, number> = {}
  for (const a of audits) {
    const lt = a.loss_type ?? 'unknown'
    byLossType[lt] = (byLossType[lt] ?? 0) + 1
  }

  // ── Status breakdown ──
  const statusBreakdown = [
    { label: 'Complete', count: complete.length, color: 'text-emerald-400' },
    { label: 'Processing', count: processing.length, color: 'text-amber-400' },
    { label: 'Error', count: error.length, color: 'text-red-400' },
  ]

  // ── Score by carrier ──
  const carrierScores: Record<string, number[]> = {}
  for (const a of complete) {
    const c = a.carrier && a.carrier !== 'Not Specified' ? a.carrier : 'Unspecified'
    const s = a.audit_result?.summary?.overall_score
    if (s != null) {
      if (!carrierScores[c]) carrierScores[c] = []
      carrierScores[c].push(s)
    }
  }
  const carrierAvgs = Object.entries(carrierScores)
    .map(([carrier, scores]) => ({
      carrier,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }))
    .sort((a, b) => a.avg - b.avg) // lowest first (most problematic)

  // ── Most flagged line items ──
  const itemCounts: Record<string, number> = {}
  for (const a of complete) {
    const missing = a.audit_result?.missing_items ?? []
    for (const m of missing) {
      const key = m.item
      itemCounts[key] = (itemCounts[key] ?? 0) + 1
    }
    const flagged = (a.audit_result?.line_items ?? []).filter((li) => li.status === 'flag')
    for (const f of flagged) {
      const key = f.item
      itemCounts[key] = (itemCounts[key] ?? 0) + 1
    }
  }
  const topFlagged = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const maxFlagCount = topFlagged.length > 0 ? topFlagged[0][1] : 1

  // ── Recent audits (last 10) ──
  const recent = audits.slice(0, 10)

  return (
    <div className="space-y-8 min-h-screen bg-gray-950">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Aggregate insights across all ClaimForge audits</p>
      </div>

      {/* ── Top stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Audits" value={String(totalAudits)} sub={`${complete.length} complete`} />
        <StatCard
          label="Avg Audit Score"
          value={avgScore != null ? `${avgScore}/100` : '—'}
          sub={`across ${scores.length} complete audits`}
          accent={avgScore != null && avgScore < 70}
        />
        <StatCard
          label="Supplement Identified"
          value={formatCurrency(totalSupplement)}
          sub="estimated missing scope"
          accent
        />
        <StatCard
          label="Total Billed"
          value={formatCurrency(totalBilled)}
          sub="across all jobs"
        />
      </div>

      {/* ── Middle row: carrier scores + loss type ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score by carrier */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Average Score by Carrier</h2>
          {carrierAvgs.length === 0 ? (
            <p className="text-gray-600 text-sm">No complete audits with carrier data yet.</p>
          ) : (
            <div className="space-y-3">
              {carrierAvgs.map(({ carrier, avg, count }) => (
                <HBar
                  key={carrier}
                  label={carrier}
                  value={avg}
                  max={100}
                  suffix={`/100 (${count})`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Loss type + status breakdown */}
        <div className="space-y-4">
          {/* Loss type */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Audits by Loss Type</h2>
            <div className="space-y-2">
              {[
                { key: 'water', label: '💧 Water', color: 'text-blue-400' },
                { key: 'fire+smoke', label: '🔥 Fire+Smoke', color: 'text-orange-400' },
                { key: 'water+fire+smoke', label: '🌊🔥 Combined', color: 'text-purple-400' },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`text-sm ${color}`}>{label}</span>
                  <span className="text-sm font-semibold text-gray-200">{byLossType[key] ?? 0}</span>
                </div>
              ))}
              {byLossType['unknown'] ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Unknown</span>
                  <span className="text-sm font-semibold text-gray-200">{byLossType['unknown']}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Status */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Audits by Status</h2>
            <div className="space-y-2">
              {statusBreakdown.map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className={`text-sm ${color}`}>{label}</span>
                  <span className="text-sm font-semibold text-gray-200">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Most flagged items ── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Most Flagged / Missing Line Items (Top 10)</h2>
        {topFlagged.length === 0 ? (
          <p className="text-gray-600 text-sm">No flagged items found yet.</p>
        ) : (
          <div className="space-y-3">
            {topFlagged.map(([item, count]) => (
              <HBar key={item} label={item} value={count} max={maxFlagCount} suffix=" audits" />
            ))}
          </div>
        )}
      </div>

      {/* ── Recent audits table ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Recent Audits</h2>
          <Link href="/audits" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-gray-800 bg-gray-900">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-gray-500 text-sm">No audits yet</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800">
                  <th className="text-left text-gray-500 font-medium px-4 py-3">Job</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">Carrier</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3 hidden md:table-cell">Loss Type</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3">Score</th>
                  <th className="text-right text-gray-500 font-medium px-4 py-3 hidden md:table-cell">Supplement</th>
                  <th className="text-right text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {recent.map((audit) => {
                  const score = audit.audit_result?.summary?.overall_score
                  const supplement = audit.audit_result?.summary?.supplement_total
                  const lossMap: Record<string, string> = {
                    water: '💧 Water',
                    'fire+smoke': '🔥 Fire+Smoke',
                    'water+fire+smoke': '🌊🔥 Combined',
                  }
                  return (
                    <tr
                      key={audit.id}
                      className="bg-gray-950 hover:bg-gray-900 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/audit/${audit.id}`} className="block">
                          <div className="text-gray-200 font-medium group-hover:text-amber-400 transition-colors text-sm">
                            {audit.job_name || <span className="text-gray-600 italic">Unnamed</span>}
                          </div>
                          <div className="text-gray-600 text-xs truncate max-w-xs">{audit.file_name}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
                        <Link href={`/audit/${audit.id}`} className="block">
                          {audit.carrier && audit.carrier !== 'Not Specified' ? audit.carrier : '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                        <Link href={`/audit/${audit.id}`} className="block">
                          {audit.loss_type ? (lossMap[audit.loss_type] ?? audit.loss_type) : '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/audit/${audit.id}`} className="block">
                          {score != null ? <ScoreBadge score={score} /> : <span className="text-gray-600">—</span>}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-amber-400 text-sm hidden md:table-cell">
                        <Link href={`/audit/${audit.id}`} className="block">
                          {supplement != null && supplement > 0 ? formatCurrency(supplement) : '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs hidden sm:table-cell">
                        <Link href={`/audit/${audit.id}`} className="block">
                          {formatDate(audit.created_at)}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

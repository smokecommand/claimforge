import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { CfAudit } from '@/lib/supabase'
import DeleteAuditButton from '@/components/DeleteAuditButton'

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

function LossTypeBadge({ lossType }: { lossType?: string }) {
  const map: Record<string, { label: string; color: string }> = {
    water: { label: '💧 Water', color: 'text-blue-400 bg-blue-950/40 border-blue-800' },
    'fire+smoke': { label: '🔥 Fire+Smoke', color: 'text-orange-400 bg-orange-950/40 border-orange-800' },
    'water+fire+smoke': { label: '🌊🔥 Combined', color: 'text-purple-400 bg-purple-950/40 border-purple-800' },
  }
  const entry = lossType ? map[lossType] : null
  if (!entry) return <span className="text-gray-500 text-xs">—</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${entry.color}`}>
      {entry.label}
    </span>
  )
}

function FileTypeBadge({ fileType }: { fileType?: string }) {
  if (!fileType) return <span className="text-gray-500 text-xs">—</span>
  const isEsx = fileType === 'esx'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
        isEsx
          ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800'
          : 'text-gray-400 bg-gray-800 border-gray-700'
      }`}
    >
      {fileType.toUpperCase()}
    </span>
  )
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    complete: 'bg-emerald-500',
    processing: 'bg-amber-500 animate-pulse',
    pending: 'bg-gray-500 animate-pulse',
    error: 'bg-red-500',
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${map[status] || 'bg-gray-600'}`} />
      <span className="capitalize text-xs text-gray-400">{status}</span>
    </span>
  )
}

export default async function AuditsPage() {
  const { data: audits, error } = await supabaseAdmin
    .from('cf_audits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6 min-h-screen bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit History</h1>
          <p className="text-gray-500 text-sm mt-1">
            {audits?.length ?? 0} audit{(audits?.length ?? 0) !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors text-sm"
        >
          + New Audit
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/30 border border-red-800 text-red-400">
          Failed to load audits: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!error && (!audits || audits.length === 0) && (
        <div className="text-center py-24 space-y-4">
          <div className="text-5xl">📋</div>
          <div className="text-gray-400 font-medium">No audits yet</div>
          <div className="text-gray-600 text-sm">Upload your first Xactimate estimate to get started.</div>
          <Link
            href="/"
            className="inline-block mt-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors"
          >
            Run Your First Audit
          </Link>
        </div>
      )}

      {/* Table */}
      {audits && audits.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                <th className="text-left text-gray-500 font-medium px-4 py-3">Job</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">Claim #</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3 hidden md:table-cell">Loss Type</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3 hidden lg:table-cell">Carrier</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">File</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Score</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">Status</th>
                <th className="text-right text-gray-500 font-medium px-4 py-3 hidden md:table-cell">Total Billed</th>
                <th className="text-right text-gray-500 font-medium px-4 py-3 hidden lg:table-cell">Supplement</th>
                <th className="text-right text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {(audits as CfAudit[]).map((audit) => {
                const score = audit.audit_result?.summary?.overall_score
                const supplement = audit.audit_result?.summary?.supplement_total
                return (
                  <tr
                    key={audit.id}
                    className="bg-gray-950 hover:bg-gray-900 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/audit/${audit.id}`} className="block">
                        <div className="text-gray-200 font-medium group-hover:text-amber-400 transition-colors">
                          {audit.job_name || <span className="text-gray-600 italic">Unnamed</span>}
                        </div>
                        <div className="text-gray-600 text-xs truncate max-w-xs">{audit.file_name}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                      <Link href={`/audit/${audit.id}`} className="block">
                        {audit.claim_number || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Link href={`/audit/${audit.id}`} className="block">
                        <LossTypeBadge lossType={audit.loss_type} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      <Link href={`/audit/${audit.id}`} className="block">
                        {audit.carrier && audit.carrier !== 'Not Specified' ? audit.carrier : '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Link href={`/audit/${audit.id}`} className="block">
                        <FileTypeBadge fileType={audit.file_type} />
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/audit/${audit.id}`} className="block">
                        {score != null ? <ScoreBadge score={score} /> : <span className="text-gray-600">—</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Link href={`/audit/${audit.id}`} className="block">
                        <StatusDot status={audit.status} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 hidden md:table-cell">
                      <Link href={`/audit/${audit.id}`} className="block">
                        {formatCurrency(audit.total_billed)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-amber-400 hidden lg:table-cell">
                      <Link href={`/audit/${audit.id}`} className="block">
                        {supplement != null && supplement > 0 ? formatCurrency(supplement) : '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs hidden sm:table-cell">
                      <Link href={`/audit/${audit.id}`} className="block">
                        {formatDate(audit.created_at)}
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <DeleteAuditButton auditId={audit.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CfAudit } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge'
import AuditResultDisplay from '@/components/AuditResult'

const POLL_INTERVAL = 3000 // 3 seconds
const MAX_POLLS = 60 // Give up after 3 minutes

export default function AuditPage() {
  const params = useParams()
  const router = useRouter()
  const auditId = params.id as string

  const [audit, setAudit] = useState<CfAudit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchAudit = useCallback(async () => {
    try {
      const response = await fetch(`/api/audit/${auditId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Audit not found. It may have been deleted or the ID is incorrect.')
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }
      const data: CfAudit = await response.json()
      setAudit(data)
      setIsLoading(false)
      return data.status
    } catch (err) {
      console.error('Poll error:', err)
      setIsLoading(false)
      return null
    }
  }, [auditId])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    let currentPoll = 0

    const poll = async () => {
      const status = await fetchAudit()
      currentPoll++
      setPollCount(currentPoll)

      if (status === 'complete' || status === 'error') {
        // Done polling
        return
      }

      if (currentPoll >= MAX_POLLS) {
        setError('Audit is taking longer than expected. Please refresh the page.')
        return
      }

      // Continue polling
      if (status === 'pending' || status === 'processing') {
        timeoutId = setTimeout(poll, POLL_INTERVAL)
      }
    }

    poll()

    return () => {
      clearTimeout(timeoutId)
    }
  }, [fetchAudit])

  const estimatedProgress = audit?.status === 'processing'
    ? Math.min(95, (pollCount / MAX_POLLS) * 100 + 10)
    : audit?.status === 'complete'
      ? 100
      : 5

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm mb-6 transition-colors"
      >
        ← New Audit
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {audit?.job_name || 'Audit Report'}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {audit?.claim_number && (
              <span className="text-gray-500 text-sm">Claim: {audit.claim_number}</span>
            )}
            {audit?.file_name && (
              <span className="text-gray-600 text-sm truncate max-w-xs">{audit.file_name}</span>
            )}
            {audit && <StatusBadge status={audit.status} />}
          </div>
        </div>

        {audit?.status === 'complete' && audit.audit_result && (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-gray-500">Audit Score</div>
              <div className="text-3xl font-bold text-amber-400">
                {audit.audit_result.summary?.overall_score ?? 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="text-5xl animate-bounce">🔍</div>
          <div className="text-gray-300 font-medium">Loading audit...</div>
        </div>
      )}

      {/* Processing State */}
      {!isLoading && audit && (audit.status === 'pending' || audit.status === 'processing') && (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
          <div className="text-6xl animate-pulse">⚙️</div>
          <div className="text-center space-y-2">
            <div className="text-gray-200 font-semibold text-lg">
              {audit.status === 'pending' ? 'Queued for audit...' : 'ClaimForge is reading your estimate...'}
            </div>
            <div className="text-gray-500 text-sm">
              Checking against S-700, NADCA ACR-2021, and carrier denial triggers
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-1000"
              style={{ width: `${estimatedProgress}%` }}
            />
          </div>
          <div className="text-gray-600 text-xs">This typically takes 30–60 seconds</div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && (error || audit?.status === 'error') && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="text-5xl">❌</div>
          <div className="text-center space-y-2">
            <div className="text-red-400 font-semibold text-lg">Audit Failed</div>
            <div className="text-gray-500 text-sm max-w-md">
              {error || audit?.error_message || 'An unexpected error occurred.'}
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {!isLoading && audit?.status === 'complete' && audit.audit_result && (
        <AuditResultDisplay audit={audit} />
      )}
    </div>
  )
}

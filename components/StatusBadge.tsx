'use client'

import { AuditStatus } from '@/lib/supabase'

interface StatusBadgeProps {
  status: AuditStatus
  className?: string
}

const statusConfig: Record<AuditStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-gray-800 text-gray-300 border border-gray-600',
  },
  processing: {
    label: 'Processing...',
    className: 'bg-amber-900/40 text-amber-300 border border-amber-700 animate-pulse',
  },
  complete: {
    label: 'Complete',
    className: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700',
  },
  error: {
    label: 'Error',
    className: 'bg-red-900/40 text-red-300 border border-red-700',
  },
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {status === 'processing' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
      {config.label}
    </span>
  )
}

interface SeverityBadgeProps {
  severity: 'low' | 'medium' | 'high'
}

const severityConfig = {
  low: { label: 'Low', className: 'bg-blue-900/40 text-blue-300 border border-blue-700' },
  medium: { label: 'Medium', className: 'bg-amber-900/40 text-amber-300 border border-amber-700' },
  high: { label: 'High', className: 'bg-red-900/40 text-red-300 border border-red-700' },
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

interface ItemStatusBadgeProps {
  status: 'pass' | 'flag' | 'missing'
}

export function ItemStatusBadge({ status }: ItemStatusBadgeProps) {
  const config = {
    pass: { label: '✓ Pass', className: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' },
    flag: { label: '⚠ Flagged', className: 'bg-amber-900/40 text-amber-300 border border-amber-700' },
    missing: { label: '✕ Missing', className: 'bg-red-900/40 text-red-300 border border-red-700' },
  }
  const c = config[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  )
}

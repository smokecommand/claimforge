'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteAuditButton({ auditId }: { auditId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`/api/audit/${auditId}`, { method: 'DELETE' })
      router.refresh()
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (deleting) return <span className="text-gray-600 text-xs px-2">deleting…</span>

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          className="text-xs px-2 py-0.5 rounded bg-red-900/60 text-red-400 hover:bg-red-800 border border-red-800 transition-colors"
        >
          confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2 py-0.5 rounded text-gray-500 hover:text-gray-300 transition-colors"
        >
          cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); setConfirming(true) }}
      className="opacity-0 group-hover:opacity-100 text-xs px-2 py-0.5 rounded text-red-500 hover:text-red-400 hover:bg-red-950/40 transition-all border border-transparent hover:border-red-900"
      title="Delete audit"
    >
      ✕
    </button>
  )
}

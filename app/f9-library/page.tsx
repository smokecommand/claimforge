'use client'

import { useState, useEffect, useCallback } from 'react'
import NavBar from '@/components/NavBar'

const CARRIERS_F9 = [
  'All Carriers',
  'State Farm',
  'Allstate',
  'Farmers',
  'USAA',
  'Citizens',
  'Liberty Mutual',
  'Nationwide',
  'Travelers',
  'Auto-Owners',
  'Erie',
  'Other',
]

const LOSS_TYPES = ['water', 'fire+smoke', 'water+fire+smoke', 'all']

interface F9Entry {
  id: string
  created_at: string
  category: string
  item_name: string
  xactimate_code: string | null
  loss_type: string
  carrier: string | null
  f9_text: string
}

const LOSS_TYPE_COLORS: Record<string, string> = {
  water: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'fire+smoke': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'water+fire+smoke': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  all: 'text-green-400 bg-green-400/10 border-green-400/20',
}

export default function F9LibraryPage() {
  const [entries, setEntries] = useState<F9Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Filters
  const [filterLossType, setFilterLossType] = useState('')
  const [filterCarrier, setFilterCarrier] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // Form state
  const [form, setForm] = useState({
    category: '',
    item_name: '',
    xactimate_code: '',
    loss_type: 'water',
    carrier: 'All Carriers',
    f9_text: '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterLossType) params.set('loss_type', filterLossType)
    if (filterCarrier && filterCarrier !== 'All Carriers') params.set('carrier', filterCarrier)
    if (filterCategory) params.set('category', filterCategory)

    try {
      const res = await fetch(`/api/f9-library?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setEntries(data)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [filterLossType, filterCarrier, filterCategory])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCopy(entry: F9Entry) {
    await navigator.clipboard.writeText(entry.f9_text)
    setCopiedId(entry.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setDeletingId(id)
    setConfirmDeleteId(null)
    try {
      await fetch(`/api/f9-library/${id}`, { method: 'DELETE' })
      await fetchEntries()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSave() {
    setFormError('')
    if (!form.category || !form.item_name || !form.loss_type || !form.f9_text) {
      setFormError('Category, item name, loss type, and F9 text are required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/f9-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          carrier: form.carrier === 'All Carriers' ? null : form.carrier,
          xactimate_code: form.xactimate_code || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setFormError(d.error || 'Failed to save entry')
        return
      }
      setForm({
        category: '',
        item_name: '',
        xactimate_code: '',
        loss_type: 'water',
        carrier: 'All Carriers',
        f9_text: '',
      })
      setShowForm(false)
      await fetchEntries()
    } catch {
      setFormError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">F9 Library</h1>
            <p className="text-gray-400 text-sm mt-1">
              Ready-to-paste justification text for Xactimate line items
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add Entry'}
          </button>
        </div>

        {/* Add Entry Form */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">New F9 Entry</h2>
            {formError && (
              <div className="mb-4 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category *</label>
                <input
                  type="text"
                  placeholder="e.g. HVAC, Odor Management, Equipment"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Air Scrubber Quantity Justification"
                  value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Xactimate Code</label>
                <input
                  type="text"
                  placeholder="e.g. WTR SCRUB"
                  value={form.xactimate_code}
                  onChange={(e) => setForm({ ...form, xactimate_code: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Loss Type *</label>
                <select
                  value={form.loss_type}
                  onChange={(e) => setForm({ ...form, loss_type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {LOSS_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Carrier</label>
                <select
                  value={form.carrier}
                  onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {CARRIERS_F9.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">F9 Text *</label>
              <textarea
                rows={6}
                placeholder="Paste the full F9 justification text here..."
                value={form.f9_text}
                onChange={(e) => setForm({ ...form, f9_text: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-y font-mono"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
              <button
                onClick={() => { setShowForm(false); setFormError('') }}
                className="border border-gray-600 hover:border-gray-400 text-gray-300 px-5 py-2 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterLossType}
            onChange={(e) => setFilterLossType(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Loss Types</option>
            {LOSS_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {lt}
              </option>
            ))}
          </select>
          <select
            value={filterCarrier}
            onChange={(e) => setFilterCarrier(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-500"
          >
            {CARRIERS_F9.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search category…"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Entries */}
        {loading ? (
          <div className="text-gray-500 text-center py-16">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-gray-500 text-center py-16 border border-gray-800 rounded-xl">
            No entries found. Add your first F9 entry above.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const isExpanded = expandedIds.has(entry.id)
              const preview =
                entry.f9_text.length > 80
                  ? entry.f9_text.slice(0, 80) + '…'
                  : entry.f9_text
              const lossColor = LOSS_TYPE_COLORS[entry.loss_type] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'

              return (
                <div
                  key={entry.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                          {entry.category}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border font-medium ${lossColor}`}
                        >
                          {entry.loss_type}
                        </span>
                        {entry.carrier && (
                          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                            {entry.carrier}
                          </span>
                        )}
                        {entry.xactimate_code && (
                          <span className="text-xs text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                            {entry.xactimate_code}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-white">{entry.item_name}</h3>
                      <p className="text-xs text-gray-400 mt-1 font-mono leading-relaxed">
                        {isExpanded ? entry.f9_text : preview}
                      </p>
                      {entry.f9_text.length > 80 && (
                        <button
                          onClick={() => toggleExpand(entry.id)}
                          className="text-xs text-amber-400 hover:text-amber-300 mt-1 transition-colors"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleCopy(entry)}
                        className="text-xs border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {copiedId === entry.id ? '✓ Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          confirmDeleteId === entry.id
                            ? 'bg-red-500 hover:bg-red-400 text-white border border-red-500'
                            : 'border border-gray-700 hover:border-red-500 text-gray-400 hover:text-red-400'
                        }`}
                      >
                        {deletingId === entry.id
                          ? 'Deleting…'
                          : confirmDeleteId === entry.id
                          ? 'Confirm Delete'
                          : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Click outside to cancel delete confirm */}
        {confirmDeleteId && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setConfirmDeleteId(null)}
          />
        )}
      </main>
    </div>
  )
}

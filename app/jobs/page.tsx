'use client'

import { useState, useEffect, useCallback } from 'react'

const CARRIERS_JOB = [
  'Not Specified',
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

const LOSS_TYPES = ['water', 'fire+smoke', 'water+fire+smoke']

const JOB_STATUSES = [
  'estimating',
  'audited',
  'supplement_filed',
  'carrier_response',
  'rebuttal_sent',
  'closed',
]

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  estimating: { label: 'Estimating', cls: 'text-gray-400 bg-gray-400/10 border-gray-400/30' },
  audited: { label: 'Audited', cls: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  supplement_filed: { label: 'Supplement Filed', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  carrier_response: { label: 'Carrier Response', cls: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  rebuttal_sent: { label: 'Rebuttal Sent', cls: 'text-orange-400 bg-orange-400/10 border-orange-400/30' },
  closed: { label: 'Closed', cls: 'text-green-400 bg-green-400/10 border-green-400/30' },
}

interface Job {
  id: string
  created_at: string
  job_name: string
  claim_number: string | null
  carrier: string | null
  loss_type: string | null
  status: string
  property_address: string | null
  insured_name: string | null
  adjuster_name: string | null
  adjuster_email: string | null
  notes: string | null
  created_by: string | null
}

const EMPTY_FORM = {
  job_name: '',
  claim_number: '',
  carrier: 'Not Specified',
  loss_type: 'fire+smoke',
  property_address: '',
  insured_name: '',
  adjuster_name: '',
  adjuster_email: '',
  notes: '',
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Per-row state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Job>>({})
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      if (Array.isArray(data)) setJobs(data)
    } catch {
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  async function handleCreate() {
    setFormError('')
    if (!form.job_name.trim()) {
      setFormError('Job name is required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          carrier: form.carrier === 'Not Specified' ? null : form.carrier,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setFormError(d.error || 'Failed to create job')
        return
      }
      setForm({ ...EMPTY_FORM })
      setShowNewForm(false)
      await fetchJobs()
    } catch {
      setFormError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(jobId: string, newStatus: string) {
    setUpdatingStatusId(jobId)
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await fetchJobs()
    } finally {
      setUpdatingStatusId(null)
    }
  }

  async function handleEditSave(jobId: string) {
    setSaving(true)
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      setEditingId(null)
      setEditForm({})
      await fetchJobs()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(jobId: string) {
    if (confirmDeleteId !== jobId) {
      setConfirmDeleteId(jobId)
      return
    }
    setDeletingId(jobId)
    setConfirmDeleteId(null)
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      await fetchJobs()
    } finally {
      setDeletingId(null)
    }
  }

  function startEdit(job: Job) {
    setEditingId(job.id)
    setEditForm({
      adjuster_name: job.adjuster_name || '',
      adjuster_email: job.adjuster_email || '',
      notes: job.notes || '',
      claim_number: job.claim_number || '',
      property_address: job.property_address || '',
      insured_name: job.insured_name || '',
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Jobs</h1>
            <p className="text-gray-400 text-sm mt-1">
              Track claims through the full lifecycle
            </p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {showNewForm ? 'Cancel' : '+ New Job'}
          </button>
        </div>

        {/* New Job Form */}
        {showNewForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Create New Job</h2>
            {formError && (
              <div className="mb-4 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Job Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Smith Residence - Water Loss"
                  value={form.job_name}
                  onChange={(e) => setForm({ ...form, job_name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Claim Number</label>
                <input
                  type="text"
                  placeholder="e.g. SF-2024-123456"
                  value={form.claim_number}
                  onChange={(e) => setForm({ ...form, claim_number: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Carrier</label>
                <select
                  value={form.carrier}
                  onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {CARRIERS_JOB.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Loss Type</label>
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
                <label className="block text-xs text-gray-400 mb-1">Property Address</label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main St, Houston, TX 77001"
                  value={form.property_address}
                  onChange={(e) => setForm({ ...form, property_address: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Insured Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Smith"
                  value={form.insured_name}
                  onChange={(e) => setForm({ ...form, insured_name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Adjuster Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={form.adjuster_name}
                  onChange={(e) => setForm({ ...form, adjuster_name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Adjuster Email</label>
                <input
                  type="email"
                  placeholder="adjuster@insurancecompany.com"
                  value={form.adjuster_email}
                  onChange={(e) => setForm({ ...form, adjuster_email: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <textarea
                rows={3}
                placeholder="Any additional notes about this job…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-y"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                {saving ? 'Creating…' : 'Create Job'}
              </button>
              <button
                onClick={() => { setShowNewForm(false); setFormError('') }}
                className="border border-gray-600 hover:border-gray-400 text-gray-300 px-5 py-2 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Jobs Table */}
        {loading ? (
          <div className="text-gray-500 text-center py-16">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="text-gray-500 text-center py-16 border border-gray-800 rounded-xl">
            No jobs yet. Create your first job above.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/60">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Job Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Carrier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Loss Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Adjuster</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Address</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, idx) => {
                  const statusInfo = STATUS_STYLES[job.status] || STATUS_STYLES.estimating
                  const isEditing = editingId === job.id

                  return (
                    <>
                      <tr
                        key={job.id}
                        className={`border-b border-gray-800/60 hover:bg-gray-900/40 transition-colors ${idx % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/20'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{job.job_name}</div>
                          {job.claim_number && (
                            <div className="text-xs text-gray-500 mt-0.5">#{job.claim_number}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{job.carrier || '—'}</td>
                        <td className="px-4 py-3 text-gray-300">{job.loss_type || '—'}</td>
                        <td className="px-4 py-3">
                          {updatingStatusId === job.id ? (
                            <span className="text-gray-500 text-xs">Updating…</span>
                          ) : (
                            <select
                              value={job.status}
                              onChange={(e) => handleStatusChange(job.id, e.target.value)}
                              className={`text-xs px-2 py-1 rounded border bg-transparent font-medium focus:outline-none cursor-pointer ${statusInfo.cls}`}
                            >
                              {JOB_STATUSES.map((s) => (
                                <option key={s} value={s} className="bg-gray-900 text-white">
                                  {STATUS_STYLES[s]?.label || s}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-300 text-xs">{job.adjuster_name || '—'}</div>
                          {job.adjuster_email && (
                            <div className="text-gray-500 text-xs">{job.adjuster_email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell max-w-[180px] truncate">
                          {job.property_address || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => (isEditing ? setEditingId(null) : startEdit(job))}
                              className="text-xs border border-gray-700 hover:border-amber-500 text-gray-400 hover:text-amber-400 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              {isEditing ? 'Cancel' : 'Edit'}
                            </button>
                            <button
                              onClick={() => handleDelete(job.id)}
                              disabled={deletingId === job.id}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                confirmDeleteId === job.id
                                  ? 'bg-red-500 text-white border-red-500 hover:bg-red-400'
                                  : 'border-gray-700 hover:border-red-500 text-gray-400 hover:text-red-400'
                              }`}
                            >
                              {deletingId === job.id
                                ? '…'
                                : confirmDeleteId === job.id
                                ? 'Confirm'
                                : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline edit row */}
                      {isEditing && (
                        <tr key={`edit-${job.id}`} className="bg-gray-900 border-b border-gray-700">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Claim Number</label>
                                <input
                                  type="text"
                                  value={editForm.claim_number as string || ''}
                                  onChange={(e) => setEditForm({ ...editForm, claim_number: e.target.value })}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Insured Name</label>
                                <input
                                  type="text"
                                  value={editForm.insured_name as string || ''}
                                  onChange={(e) => setEditForm({ ...editForm, insured_name: e.target.value })}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Property Address</label>
                                <input
                                  type="text"
                                  value={editForm.property_address as string || ''}
                                  onChange={(e) => setEditForm({ ...editForm, property_address: e.target.value })}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Adjuster Name</label>
                                <input
                                  type="text"
                                  value={editForm.adjuster_name as string || ''}
                                  onChange={(e) => setEditForm({ ...editForm, adjuster_name: e.target.value })}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Adjuster Email</label>
                                <input
                                  type="email"
                                  value={editForm.adjuster_email as string || ''}
                                  onChange={(e) => setEditForm({ ...editForm, adjuster_email: e.target.value })}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>
                            <div className="mb-3">
                              <label className="block text-xs text-gray-400 mb-1">Notes</label>
                              <textarea
                                rows={2}
                                value={editForm.notes as string || ''}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 resize-y"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditSave(job.id)}
                                disabled={saving}
                                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
                              >
                                {saving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={() => { setEditingId(null); setEditForm({}) }}
                                className="border border-gray-600 hover:border-gray-400 text-gray-300 px-4 py-1.5 rounded-lg text-sm transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
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
